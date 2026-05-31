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
}
