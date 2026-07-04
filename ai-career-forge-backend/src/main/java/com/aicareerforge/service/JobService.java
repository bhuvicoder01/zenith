package com.aicareerforge.service;

import com.aicareerforge.model.Job;
import com.aicareerforge.model.UserProfile;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Thin facade that delegates to the decomposed job pipeline services.
 * Preserves backward compatibility — all existing callers (controllers, other services)
 * continue to inject and use JobService with zero changes.
 *
 * Delegation map:
 *   Fetching     → {@link JobSyncOrchestrator}
 *   Catalog/CRUD → {@link JobCatalogService}
 *   Scoring      → {@link JobScoringService}
 *   Score Cache  → {@link JobScoreCache}
 *   Matching     → {@link JobMatchingService}
 *   Enrichment   → {@link JobEnrichmentService}
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class JobService {

    private final JobCatalogService catalogService;
    private final JobMatchingService matchingService;
    private final JobScoringService scoringService;
    private final JobScoreCache scoreCache;
    private final JobSyncOrchestrator syncOrchestrator;
    private final JobEnrichmentService enrichmentService;
    private final com.aicareerforge.repository.UserJobMatchRepository userJobMatchRepository;
    private final com.aicareerforge.repository.ApplicationRepository applicationRepository;

    // ─── Catalog (CRUD) ──────────────────────────────────────

    public Page<Job> getJobs(int page, int size) {
        return catalogService.getJobs(page, size);
    }

    public List<Job> getRecentJobs() {
        return catalogService.getRecentJobs();
    }

    public Job getJobById(String id) {
        return catalogService.getJobById(id);
    }

    public Job saveJob(Job job) {
        return catalogService.saveJob(job);
    }

    public void purgeJobsForUser(String userId) {
        catalogService.purgeJobsForUser(userId);
    }

    public void purgeAllJobs() {
        catalogService.purgeAllJobs();
    }

    public void reindexAllJobs() {
        catalogService.reindexAllJobs();
    }

    // ─── Fetching (Sync) ─────────────────────────────────────

    public List<Job> fetchAndSyncAdzunaJobs(String keyword, String location, String userId) {
        return syncOrchestrator.fetchAndSyncAdzunaJobs(keyword, location, userId);
    }

    public List<Job> fetchAndSyncRemotiveJobs(String keyword, String userId) {
        return syncOrchestrator.fetchAndSyncRemotiveJobs(keyword, userId);
    }

    public List<Job> fetchAndSyncJSearchJobs(String keyword, String location, String userId) {
        return syncOrchestrator.fetchAndSyncJSearchJobs(keyword, location, userId);
    }

    public List<Job> fetchAndSyncJobs(String keyword, String location) {
        return syncOrchestrator.fetchAndSyncJobs(keyword, location);
    }

    // ─── Matching ────────────────────────────────────────────
 
    public List<Job> getRecommendedJobs(UserProfile profile) {
        return matchingService.getRecommendedJobs(profile);
    }
 
    public List<Job> getJobCatalog(UserProfile profile) {
        return matchingService.getJobCatalog(profile);
    }

    public Page<Job> getRecommendedJobsPaginated(UserProfile profile, int page, int size) {
        return matchingService.getRecommendedJobsPaginated(profile, page, size);
    }

    public Page<Job> getJobCatalogPaginated(UserProfile profile, String search, String location, String source, 
                                            String experienceLevel, String remotePolicy, Double salaryMin, int page, int size) {
        return matchingService.getJobCatalogPaginated(profile, search, location, source, experienceLevel, remotePolicy, salaryMin, page, size);
    }

    // ─── Scoring ─────────────────────────────────────────────

    public double calculateMatchScore(Job job, UserProfile profile, Double vectorSimilarity) {
        return scoringService.calculateMatchScore(job, profile, vectorSimilarity);
    }

    public List<String> detectMatchedSkills(Job job, String userProfileSkills) {
        return scoringService.detectMatchedSkills(job, userProfileSkills);
    }

    public Double getCachedScore(String userId, String jobId) {
        return scoreCache.getScore(userId, jobId);
    }

    public String generateAndSaveCultureInsights(String jobId) {
        return enrichmentService.generateAndSaveCultureInsights(jobId);
    }

    public String generateAndSaveRelevanceExplanation(String jobId, UserProfile profile) {
        return enrichmentService.generateAndSaveRelevanceExplanation(jobId, profile);
    }

    public String getCachedRelevanceExplanation(String jobId, String userId) {
        return enrichmentService.getCachedRelevanceExplanation(jobId, userId);
    }

    public void updateJobPipelineStage(String userId, String jobId, String stage) {
        log.info("Updating pipeline stage to {} for user: {}, job: {}", stage, userId, jobId);
        com.aicareerforge.model.UserJobMatch match = userJobMatchRepository.findFirstByUserIdAndJobId(userId, jobId)
                .orElseGet(() -> com.aicareerforge.model.UserJobMatch.builder()
                        .userId(userId)
                        .jobId(jobId)
                        .build());
        
        match.setPipelineStage(stage);
        userJobMatchRepository.save(match);

        // Optional: Synchronize with tracker (Application)
        try {
            List<com.aicareerforge.model.Application> apps = applicationRepository.findByUserIdAndJobId(userId, jobId);
            if (apps.isEmpty()) {
                if (!"DISCOVERED".equals(stage)) {
                    Job job = catalogService.getJobById(jobId);
                    if (job != null) {
                        com.aicareerforge.model.Application.Status appStatus = getAppStatusFromPipelineStage(stage);
                        com.aicareerforge.model.Application app = com.aicareerforge.model.Application.builder()
                                .userId(userId)
                                .jobId(jobId)
                                .jobTitle(job.getTitle())
                                .company(job.getCompany())
                                .status(appStatus)
                                .appliedDate(java.time.LocalDateTime.now())
                                .build();
                        applicationRepository.save(app);
                        log.info("Automatically created Application tracking item for job: {}", jobId);
                    }
                }
            } else {
                com.aicareerforge.model.Application.Status appStatus = getAppStatusFromPipelineStage(stage);
                apps.forEach(app -> {
                    app.setStatus(appStatus);
                    applicationRepository.save(app);
                });
                log.info("Synchronized existing Application tracking items to status: {}", appStatus);
            }
        } catch (Exception e) {
            log.error("Failed to synchronize pipeline stage change to Application tracker: {}", e.getMessage());
        }
    }

    private com.aicareerforge.model.Application.Status getAppStatusFromPipelineStage(String stage) {
        if (stage == null) return com.aicareerforge.model.Application.Status.SAVED;
        switch (stage.toUpperCase()) {
            case "SAVED":
                return com.aicareerforge.model.Application.Status.SAVED;
            case "APPLYING":
            case "APPLIED":
                return com.aicareerforge.model.Application.Status.APPLIED;
            case "INTERVIEWING":
                return com.aicareerforge.model.Application.Status.INTERVIEW;
            case "OFFER":
                return com.aicareerforge.model.Application.Status.OFFER;
            case "REJECTED":
                return com.aicareerforge.model.Application.Status.REJECTED;
            default:
                return com.aicareerforge.model.Application.Status.SAVED;
        }
    }

    public List<Job> getJobPipeline(String userId) {
        log.info("Loading Kanban job pipeline for user: {}", userId);
        List<String> pipelineStages = List.of("SAVED", "APPLYING", "APPLIED", "INTERVIEWING", "OFFER", "REJECTED");
        List<com.aicareerforge.model.UserJobMatch> matches = userJobMatchRepository.findByUserIdAndPipelineStageIn(userId, pipelineStages);

        List<Job> jobs = new java.util.ArrayList<>();
        for (com.aicareerforge.model.UserJobMatch match : matches) {
            Job job = catalogService.getJobById(match.getJobId());
            if (job != null) {
                job.setMatchScore(match.getMatchScore());
                job.setRelevanceExplanation(match.getRelevanceExplanation());
                job.setPipelineStage(match.getPipelineStage());
                jobs.add(job);
            }
        }
        return jobs;
    }
}
