package com.aicareerforge.service;

import com.aicareerforge.model.Job;
import com.aicareerforge.model.UserJobMatch;
import com.aicareerforge.model.UserProfile;
import com.aicareerforge.repository.JobRepository;
import com.aicareerforge.repository.UserJobMatchRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Semaphore;

/**
 * Handles all asynchronous AI enrichment:
 *   - Culture analysis via LLM
 *   - Company logo resolution via brand APIs
 *   - Vector store indexing
 *   - Per-user relevance explanation generation
 *
 * All methods are @Async so they don't block the primary sync/recommendation path.
 * A semaphore limits concurrent enrichment to avoid overwhelming the AI/embedding APIs.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class JobEnrichmentService {

    private final CompanyIntelligenceService companyIntelligenceService;
    private final JobRecommendationAgent recommendationAgent;
    private final JobRepository jobRepository;
    private final UserJobMatchRepository userJobMatchRepository;

    /** Limits concurrent AI/embedding API calls to avoid rate-limit exhaustion. */
    private final Semaphore enrichmentSemaphore = new Semaphore(2);

    /** Tracks which (userId:jobId) pairs are currently being enriched to prevent duplicates. */
    private final Set<String> processingExplanations = ConcurrentHashMap.newKeySet();

    /**
     * Check if a (userId, jobId) pair is currently undergoing background enrichment.
     */
    public boolean isProcessing(String userId, String jobId) {
        return processingExplanations.contains(userId + ":" + jobId);
    }

    /**
     * Mark a (userId, jobId) pair as being processed.
     */
    public void markProcessing(String userId, String jobId) {
        processingExplanations.add(userId + ":" + jobId);
    }

    /**
     * Asynchronously enriches a job with AI culture insights, company logos,
     * and updates the vector store index. Keeps the primary sync fast.
     */
    @Async("taskExecutor")
    public void enrichAndIndexJobAsync(Job job) {
        try {
            enrichmentSemaphore.acquire();
            // Throttle: avoid hitting embedding API rate limits
            Thread.sleep(3000);
            log.debug("Background enrichment started for: {} at {}", job.getTitle(), job.getCompany());

            // 1. Resolve Premium Logo (uses local domain heuristic, no LLM calls)
            CompanyIntelligenceService.LogoMetaData logoMeta = companyIntelligenceService.findCompanyLogoUrl(job.getCompany());
            if (logoMeta != null && logoMeta.url() != null && !logoMeta.url().isBlank()) {
                job.setCompanyLogoUrl(logoMeta.url());
                job.setCompanyLogoTheme(logoMeta.theme());
                job.setCompanyLogoColor(logoMeta.color());
            }

            // 2. Save the job
            jobRepository.save(job);

            // 3. Update Vector Store with content
            recommendationAgent.indexJob(job);

            log.debug("Background enrichment completed for: {}", job.getTitle());
        } catch (Exception e) {
            log.error("Background enrichment failed for job {}: {}", job.getId(), e.getMessage());
        } finally {
            enrichmentSemaphore.release();
        }
    }

    /**
     * Asynchronously generates AI relevance explanations for a batch of jobs.
     * Allows the UI to return immediately while the AI works in the background.
     *
     * @param jobs            list of jobs needing explanations
     * @param userProfileData raw resume text for grounding the explanation
     * @param userId          the user these explanations are for
     */
    @Async("taskExecutor")
    public void enrichJobRelevanceAsync(List<Job> jobs, String userProfileData, String userId) {
        log.info("Starting background relevance enrichment for {} jobs and user {}", jobs.size(), userId);
        try {
            for (Job job : jobs) {
                String key = userId + ":" + job.getId();
                try {
                    Thread.sleep(1000);

                    UserJobMatch match = userJobMatchRepository.findFirstByUserIdAndJobId(userId, job.getId())
                            .orElse(UserJobMatch.builder().userId(userId).jobId(job.getId()).build());

                    if (match.getRelevanceExplanation() == null || match.getRelevanceExplanation().isBlank()) {
                        String explanation = recommendationAgent.generateRelevanceExplanation(job, userProfileData);
                        match.setRelevanceExplanation(explanation);
                        match.setMatchScore(job.getMatchScore());
                        userJobMatchRepository.save(match);

                        log.debug("Background explanation saved to UserJobMatch for job: {}", job.getId());
                    }
                } catch (Exception e) {
                    log.error("Failed background explanation for job {}: {}", job.getId(), e.getMessage());
                } finally {
                    processingExplanations.remove(key);
                }
            }
        } finally {
            jobs.forEach(j -> processingExplanations.remove(userId + ":" + j.getId()));
        }
    }

    /**
     * Lazy-load culture insights on-demand.
     */
    public String generateAndSaveCultureInsights(String jobId) {
        Job job = jobRepository.findById(jobId).orElse(null);
        if (job == null) return null;

        if (job.getCultureAnalysis() != null && !job.getCultureAnalysis().isBlank()) {
            return job.getCultureAnalysis();
        }

        try {
            log.info("Generating culture insights on-demand for company: {}", job.getCompany());
            String culture = companyIntelligenceService.fetchCultureInsights(job.getCompany(), job.getTitle());
            job.setCultureAnalysis(culture);
            jobRepository.save(job);
            return culture;
        } catch (Exception e) {
            log.error("Failed to generate culture insights on-demand for job {}: {}", jobId, e.getMessage());
            return "Culture insights are currently unavailable.";
        }
    }

    /**
     * Lazy-load relevance explanation on-demand.
     */
    public String generateAndSaveRelevanceExplanation(String jobId, UserProfile profile) {
        String userId = profile.getUserId();
        UserJobMatch match = userJobMatchRepository.findFirstByUserIdAndJobId(userId, jobId)
                .orElse(UserJobMatch.builder().userId(userId).jobId(jobId).build());

        if (match.getRelevanceExplanation() != null && !match.getRelevanceExplanation().isBlank() && !match.getRelevanceExplanation().contains("profile")) {
            return match.getRelevanceExplanation();
        }

        Job job = jobRepository.findById(jobId).orElse(null);
        if (job == null) return null;

        try {
            log.info("Generating relevance explanation on-demand for user: {} and job: {}", userId, jobId);
            String explanation = recommendationAgent.generateRelevanceExplanation(job, profile.getRawResumeText());
            match.setRelevanceExplanation(explanation);

            if (job.getMatchScore() != null) {
                match.setMatchScore(job.getMatchScore());
            }

            userJobMatchRepository.save(match);
            return explanation;
        } catch (Exception e) {
            log.error("Failed to generate relevance explanation on-demand for job {}: {}", jobId, e.getMessage());
            return "Failed to analyze profile alignment due to service constraints.";
        }
    }
}
