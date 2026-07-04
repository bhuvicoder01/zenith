package com.aicareerforge.service;

import com.aicareerforge.model.Job;
import com.aicareerforge.model.UserJobMatch;
import com.aicareerforge.model.UserProfile;
import com.aicareerforge.repository.JobRepository;
import com.aicareerforge.repository.UserJobMatchRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.document.Document;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.domain.PageImpl;
import org.springframework.stereotype.Service;
import org.springframework.cache.annotation.Cacheable;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

/**
 * Orchestrates the 3-layer hybrid matching pipeline:
 *
 *   Layer 1 — Retrieval:  Vector similarity search (MongoDB Atlas) + fallback text search
 *   Layer 2 — Scoring:    Deterministic multi-factor scoring via {@link JobScoringService}
 *   Layer 3 — Explanation: Background AI enrichment via {@link JobEnrichmentService}
 *
 * This is the primary service for the "Recommended Jobs" and "Job Catalog" features.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class JobMatchingService {

    private final JobRecommendationAgent recommendationAgent;
    private final JobScoringService scoringService;
    private final JobScoreCache scoreCache;
    private final JobCatalogService catalogService;
    private final JobEnrichmentService enrichmentService;
    private final UserJobMatchRepository userJobMatchRepository;
    private final JobRepository jobRepository;
    private final MongoTemplate mongoTemplate;

    // Self-reference for @Async proxy (set via setter injection to break circular dep)
    @lombok.Setter(onMethod_ = {@org.springframework.beans.factory.annotation.Autowired, @org.springframework.context.annotation.Lazy})
    private JobMatchingService self;

    // ─── Recommended Jobs (Vector Search Pipeline) ───────────

    /**
     * Get AI-recommended jobs for a user profile using hybrid retrieval + scoring + explanation.
     *
     * Pipeline:
     *   1. Build optimized search query from profile skills/goals
     *   2. Vector similarity search via MongoDB Atlas (top 50)
     *   3. Multi-factor scoring on each result
     *   4. Load persisted UserJobMatch data (explanations, saved scores)
     *   5. Trigger background AI enrichment for un-explained jobs
     *   6. Return deduplicated, scored, sorted list
     */
    @Cacheable(value = "recommendedJobs", key = "#profile.userId", unless = "#result == null || #result.isEmpty()")
    public List<Job> getRecommendedJobs(UserProfile profile) {
        String userProfileData = profile.getRawResumeText();

        // Build optimized search query
        String searchQuery = buildSearchQuery(profile, userProfileData);

        int totalExperienceYears = scoringService.estimateExperienceYears(profile);
        log.info("Estimated total experience years: {}", totalExperienceYears);

        // Layer 1: Vector Retrieval
        List<Document> documents;
        try {
            documents = recommendationAgent.searchSimilarJobs(searchQuery);
            log.info("Vector search found {} matching documents", documents.size());
        } catch (Exception e) {
            log.error("Vector search failed: {}. Falling back to stored jobs.", e.getMessage());
            return getFallbackJobs(profile);
        }

        if (documents.isEmpty()) {
            log.info("Vector search returned 0 results, falling back to stored jobs for user.");
            return getFallbackJobs(profile);
        }

        // Layer 2: Scoring + Data Hydration
        List<Job> allMatchedJobs = documents.stream()
                .map(doc -> hydrateAndScoreJob(doc, profile))
                .filter(Objects::nonNull)
                .collect(Collectors.toList());

        List<Job> finalJobs = catalogService.deduplicateJobs(allMatchedJobs);

        // Set baseline relevance description; customized explanation will be lazy-loaded on detail view
        for (Job job : finalJobs) {
            if (job.getRelevanceExplanation() == null || job.getRelevanceExplanation().isBlank()) {
                job.setRelevanceExplanation("Strong match based on your profile skills and goals.");
            }
        }

        return finalJobs;
    }

    // ─── Job Catalog (All Jobs with Scores) ──────────────────

    /**
     * Returns all jobs applicable to the user (user-specific + global pool)
     * with calculated match scores. Sorted by score descending.
     * Filters out EXPIRED jobs from the catalog.
     */
    @Cacheable(value = "jobCatalog", key = "#profile.userId", unless = "#result == null || #result.isEmpty()")
    public List<Job> getJobCatalog(UserProfile profile) {
        String userId = profile.getUserId();
        log.info("Fetching complete job catalog for user: {}", userId);

        List<Job> allJobs = new ArrayList<>();

        // 1. User-specific jobs
        if (userId != null) {
            allJobs.addAll(catalogService.getJobsByUserId(userId));
        }

        // 2. Global pool jobs (userId is null)
        allJobs.addAll(catalogService.getGlobalPoolJobs());

        // 3. Filter out EXPIRED jobs
        allJobs = allJobs.stream()
                .filter(job -> job.getStatus() != Job.JobStatus.EXPIRED)
                .collect(Collectors.toList());

        // 4. Score and load user-specific data
        for (Job job : allJobs) {
            Double cachedScore = scoreCache.getScore(userId, job.getId());

            UserJobMatch match = userJobMatchRepository.findFirstByUserIdAndJobId(userId, job.getId()).orElse(null);
            if (match != null) {
                job.setRelevanceExplanation(match.getRelevanceExplanation());
                job.setMatchScore(match.getMatchScore() != null ? match.getMatchScore() : cachedScore);
            }

            if (job.getMatchScore() == null) {
                Double calculatedScore = scoringService.calculateMatchScore(job, profile, 0.5);
                job.setMatchScore(calculatedScore);
                scoreCache.putScore(userId, job.getId(), calculatedScore);
            }
        }

        return catalogService.deduplicateJobs(allJobs);
    }

    // ─── Fallback (No Vector Store) ──────────────────────────

    /**
     * Fallback when the embedding API is unavailable or vector search returns no results.
     * Uses MongoDB text queries + skill-based scoring.
     * Includes both user-specific jobs and the global job pool.
     * Filters out EXPIRED jobs.
     */
    private List<Job> getFallbackJobs(UserProfile profile) {
        String userId = profile.getUserId();
        log.info("Fallback: Searching for jobs in MongoDB for user {} based on skills", userId);

        List<Job> candidateJobs = new ArrayList<>();

        // 1. User-specific jobs
        if (userId != null) {
            candidateJobs.addAll(catalogService.getJobsByUserId(userId));
        }

        // 2. Global pool jobs matching skills
        if (profile.getSkills() != null && !profile.getSkills().isEmpty()) {
            for (String skill : profile.getSkills().stream().limit(5).collect(Collectors.toList())) {
                if (skill.length() < 3) continue;
                List<Job> skillMatches = jobRepository.findFallbackJobs(skill);
                for (Job sj : skillMatches) {
                    if (candidateJobs.stream().noneMatch(j -> j.getId().equals(sj.getId()))) {
                        candidateJobs.add(sj);
                    }
                }
                if (candidateJobs.size() > 100) break;
            }
        }

        // 3. If still very few, get recent global jobs
        if (candidateJobs.size() < 10) {
            candidateJobs.addAll(catalogService.getGlobalPoolJobs());
        }

        // 4. Filter out EXPIRED jobs
        candidateJobs = candidateJobs.stream()
                .filter(job -> job.getStatus() != Job.JobStatus.EXPIRED)
                .collect(Collectors.toList());

        log.info("Fallback: found {} candidate jobs for scoring", candidateJobs.size());

        for (Job job : candidateJobs) {
            Double score = scoringService.calculateMatchScore(job, profile, 0.5);
            job.setMatchScore(score);
            scoreCache.putScore(userId, job.getId(), score);

            if (job.getRelevanceExplanation() == null || job.getRelevanceExplanation().isBlank()) {
                job.setRelevanceExplanation("Matched based on your profile skills and preferences.");
            }
        }

        return catalogService.deduplicateJobs(candidateJobs).stream().limit(50).collect(Collectors.toList());
    }

    // ─── Private Helpers ─────────────────────────────────────

    /**
     * Build an optimized search query from the user's profile for vector search.
     */
    private String buildSearchQuery(UserProfile profile, String userProfileData) {
        String searchQuery = (userProfileData != null) ? userProfileData : "";
        if (profile.getSkills() != null && !profile.getSkills().isEmpty()) {
            searchQuery = String.join(", ", profile.getSkills()) + ". " +
                          (profile.getParsedGoals() != null ? profile.getParsedGoals() : "");
            log.info("Using optimized skill-based query for vector search (length: {})", searchQuery.length());
        }
        return searchQuery;
    }

    /**
     * Convert a vector search Document into a scored Job with user-specific match data.
     */
    private Job hydrateAndScoreJob(Document doc, UserProfile profile) {
        String jobId = (String) doc.getMetadata().get("jobId");
        if (jobId == null) return null;

        Job job = jobRepository.findById(jobId).orElse(null);
        if (job == null) {
            log.warn("Job ID {} found in vector store but not in repository", jobId);
            return null;
        }

        // Skip jobs belonging to other users
        if (job.getUserId() != null && !job.getUserId().equals(profile.getUserId())) {
            return null;
        }

        // Skip EXPIRED jobs
        if (job.getStatus() == Job.JobStatus.EXPIRED) {
            return null;
        }

        // Extract vector similarity from document metadata
        Double vectorSimilarity = extractVectorSimilarity(doc);

        // Score using the deterministic scoring engine
        Double finalScore = scoringService.calculateMatchScore(job, profile, vectorSimilarity);
        job.setMatchScore(finalScore);

        // Load user-specific match data (Explanation, Score, etc.)
        UserJobMatch match = userJobMatchRepository.findFirstByUserIdAndJobId(profile.getUserId(), job.getId()).orElse(null);
        if (match != null) {
            job.setRelevanceExplanation(match.getRelevanceExplanation());
            if (match.getMatchScore() != null) job.setMatchScore(match.getMatchScore());
        }

        // Cache the score
        if (profile.getUserId() != null) {
            scoreCache.putScore(profile.getUserId(), job.getId(), job.getMatchScore());
        }

        return job;
    }

    /**
     * Extract vector similarity score from document metadata.
     * Handles both "distance" (cosine distance) and "score" metadata keys.
     */
    private Double extractVectorSimilarity(Document doc) {
        Double vectorSimilarity = 0.0;
        Object distance = doc.getMetadata().get("distance");
        if (distance instanceof Double d) {
            vectorSimilarity = 1.0 - d;
        } else {
            Object scoreObj = doc.getMetadata().get("score");
            if (scoreObj instanceof Double s) {
                vectorSimilarity = s;
            }
        }
        return vectorSimilarity;
    }

    /**
     * Trigger background AI enrichment for jobs that don't have relevance explanations yet.
     */
    private void triggerBackgroundEnrichment(List<Job> jobs, String userProfileData, String userId) {
        List<Job> jobsToEnrich = jobs.stream()
                .filter(j -> {
                    boolean needsEnrichment = j.getRelevanceExplanation() == null ||
                                              j.getRelevanceExplanation().isBlank() ||
                                              j.getRelevanceExplanation().contains("background") ||
                                              j.getRelevanceExplanation().equals("Strong match based on your profile skills and goals.");
                    return needsEnrichment && !enrichmentService.isProcessing(userId, j.getId());
                })
                .limit(15)
                .collect(Collectors.toList());

        if (!jobsToEnrich.isEmpty()) {
            jobsToEnrich.forEach(j -> enrichmentService.markProcessing(userId, j.getId()));
            enrichmentService.enrichJobRelevanceAsync(jobsToEnrich, userProfileData, userId);
        }
    }

    // ─── Paginated Catalog & Recommendations ──────────────────

    /**
     * Highly performant dynamic server-side paginated catalog fetching.
     * Scores only the requested subset of results, and gives a priority boost to LinkedIn jobs.
     */
    public Page<Job> getJobCatalogPaginated(UserProfile profile, String search, String location, String source, 
                                            String experienceLevel, String remotePolicy, Double salaryMin, int page, int size) {
        String userId = profile.getUserId();
        log.info("Fetching paginated catalog for user: {} (page: {}, size: {})", userId, page, size);

        List<Criteria> criteriaList = new ArrayList<>();

        // Scope: global pool (userId = null) OR user-specific jobs
        criteriaList.add(new Criteria().orOperator(
            Criteria.where("userId").is(null),
            Criteria.where("userId").is(userId)
        ));

        // Filter out EXPIRED jobs
        criteriaList.add(Criteria.where("status").ne(Job.JobStatus.EXPIRED));

        // Search text filter
        if (search != null && !search.isBlank()) {
            criteriaList.add(new Criteria().orOperator(
                Criteria.where("title").regex(search, "i"),
                Criteria.where("company").regex(search, "i"),
                Criteria.where("description").regex(search, "i")
            ));
        }

        // Location filter
        if (location != null && !location.isBlank()) {
            criteriaList.add(Criteria.where("location").regex(location, "i"));
        }

        // Source filter
        if (source != null && !source.isBlank()) {
            criteriaList.add(Criteria.where("source").is(source.toLowerCase()));
        }

        // Experience Level filter
        if (experienceLevel != null && !experienceLevel.isBlank()) {
            criteriaList.add(Criteria.where("experienceLevel").is(experienceLevel.toUpperCase()));
        }

        // Remote Policy filter
        if (remotePolicy != null && !remotePolicy.isBlank()) {
            criteriaList.add(Criteria.where("remotePolicy").is(remotePolicy.toUpperCase()));
        }

        // Salary minimum filter
        if (salaryMin != null && salaryMin > 0) {
            criteriaList.add(Criteria.where("salaryMin").gte(salaryMin));
        }

        Query query = new Query();
        if (!criteriaList.isEmpty()) {
            query.addCriteria(new Criteria().andOperator(criteriaList.toArray(new Criteria[0])));
        }

        // Count total matches
        long total = mongoTemplate.count(query, Job.class);

        // Sorting & Pagination parameters
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "postedDate"));
        query.with(pageable);

        List<Job> jobs = mongoTemplate.find(query, Job.class);

        // Score only the returned page of jobs
        for (Job job : jobs) {
            Double cachedScore = scoreCache.getScore(userId, job.getId());
            UserJobMatch match = userJobMatchRepository.findFirstByUserIdAndJobId(userId, job.getId()).orElse(null);
            
            if (match != null) {
                job.setRelevanceExplanation(match.getRelevanceExplanation());
                job.setMatchScore(match.getMatchScore() != null ? match.getMatchScore() : cachedScore);
                job.setPipelineStage(match.getPipelineStage());
            }

            if (job.getMatchScore() == null) {
                Double calculatedScore = scoringService.calculateMatchScore(job, profile, 0.5);
                job.setMatchScore(calculatedScore);
                scoreCache.putScore(userId, job.getId(), calculatedScore);
            }

            // LinkedIn Primary Source matching score boost (+3.0 points up to a limit of 100)
            if ("linkedin".equalsIgnoreCase(job.getSource()) && job.getMatchScore() != null && job.getMatchScore() < 100) {
                job.setMatchScore(Math.min(100.0, job.getMatchScore() + 3.0));
            }
        }

        return new PageImpl<>(catalogService.deduplicateJobs(jobs), pageable, total);
    }

    /**
     * Get paginated AI-recommended jobs.
     * Paginates the top 50 semantic matches in-memory.
     */
    public Page<Job> getRecommendedJobsPaginated(UserProfile profile, int page, int size) {
        List<Job> allRecommendations = getRecommendedJobs(profile);
        int start = Math.min(page * size, allRecommendations.size());
        int end = Math.min(start + size, allRecommendations.size());
        
        List<Job> subList = allRecommendations.subList(start, end);
        Pageable pageable = PageRequest.of(page, size);
        return new PageImpl<>(subList, pageable, allRecommendations.size());
    }
}
