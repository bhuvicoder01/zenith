package com.aicareerforge.service;

import com.aicareerforge.model.Job;
import com.aicareerforge.repository.JobRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

/**
 * Central catalog service for job CRUD, deduplication, and lifecycle management.
 * Treats jobs like a product catalog with lifecycle flags rather than raw API responses.
 *
 * Lifecycle:
 *   ACTIVE  → seen in latest sync
 *   STALE   → not seen for 48+ hours (hidden from recommendations, kept for history)
 *   EXPIRED → stale for 14+ days (fully archived)
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class JobCatalogService {

    private final JobRepository jobRepository;
    private final JobRecommendationAgent recommendationAgent;
    private final JobScoreCache scoreCache;

    // ─── CRUD ────────────────────────────────────────────────

    public Job getJobById(String id) {
        return jobRepository.findById(id).orElse(null);
    }

    public Page<Job> getJobs(int page, int size) {
        return jobRepository.findAll(PageRequest.of(page, size));
    }

    public List<Job> getRecentJobs() {
        return jobRepository.findTop50ByUserIdIsNullOrderByPostedDateDesc();
    }

    public List<Job> getJobsByUserId(String userId) {
        return jobRepository.findByUserId(userId);
    }

    public List<Job> getGlobalPoolJobs() {
        return jobRepository.findTop50ByUserIdIsNullOrderByPostedDateDesc();
    }

    // ─── Save with Dedup ─────────────────────────────────────

    /**
     * Save a job with user-scoped or global deduplication.
     * If a job with the same sourceJobId already exists for this scope,
     * returns the existing one (re-indexed) instead of creating a duplicate.
     * Also touches the lastSeenAt timestamp for lifecycle tracking.
     */
    public Job saveJob(Job job) {
        // User-scoped dedup: check by sourceJobId + userId
        if (job.getUserId() != null) {
            Job existingJob = jobRepository.findBySourceJobIdAndUserId(job.getSourceJobId(), job.getUserId()).orElse(null);
            if (existingJob == null) {
                if (job.getFirstSeenAt() == null) job.setFirstSeenAt(LocalDateTime.now());
                job.setLastSeenAt(LocalDateTime.now());
                job.setStatus(Job.JobStatus.ACTIVE);
                Job savedJob = jobRepository.save(job);
                recommendationAgent.indexJob(savedJob);
                return savedJob;
            } else {
                // Mark as still active and update lastSeenAt
                touchJob(existingJob);
                recommendationAgent.indexJob(existingJob);
                return existingJob;
            }
        } else {
            // Global dedup: check by sourceJobId where userId is null
            Job existingJob = jobRepository.findBySourceJobIdAndUserIdIsNull(job.getSourceJobId()).orElse(null);
            if (existingJob == null) {
                if (job.getFirstSeenAt() == null) job.setFirstSeenAt(LocalDateTime.now());
                job.setLastSeenAt(LocalDateTime.now());
                job.setStatus(Job.JobStatus.ACTIVE);
                Job savedJob = jobRepository.save(job);
                recommendationAgent.indexJob(savedJob);
                return savedJob;
            } else {
                touchJob(existingJob);
                recommendationAgent.indexJob(existingJob);
                return existingJob;
            }
        }
    }

    /**
     * Check if a job already exists for the given scope.
     */
    public boolean exists(String sourceJobId, String userId) {
        if (userId != null) {
            return jobRepository.existsBySourceJobIdAndUserId(sourceJobId, userId);
        } else {
            return jobRepository.existsBySourceJobIdAndUserIdIsNull(sourceJobId);
        }
    }

    // ─── Lifecycle Management ────────────────────────────────

    /**
     * Touch a job — update lastSeenAt and mark as ACTIVE.
     * Called during sync when a job is seen again from a source API.
     */
    public void touchJob(Job job) {
        job.setLastSeenAt(LocalDateTime.now());
        if (job.getStatus() != Job.JobStatus.ACTIVE) {
            log.info("Reactivating previously {} job: {} ({})", job.getStatus(), job.getTitle(), job.getId());
            job.setStatus(Job.JobStatus.ACTIVE);
        }
        jobRepository.save(job);
    }

    /**
     * Periodic lifecycle sweep: mark stale and expire old jobs.
     * Runs every 12 hours.
     *   - Jobs not seen for 48 hours → STALE
     *   - Jobs not seen for 14 days  → EXPIRED
     */
    @Scheduled(cron = "0 30 */12 * * *") // Every 12 hours at :30
    public void sweepJobLifecycle() {
        log.info("Starting job lifecycle sweep...");

        LocalDateTime staleThreshold = LocalDateTime.now().minusHours(48);
        LocalDateTime expiredThreshold = LocalDateTime.now().minusDays(14);

        List<Job> allJobs = jobRepository.findAll();
        int staleCount = 0;
        int expiredCount = 0;

        for (Job job : allJobs) {
            if (job.getStatus() == Job.JobStatus.EXPIRED) continue; // Already archived

            LocalDateTime lastSeen = job.getLastSeenAt();
            if (lastSeen == null) lastSeen = job.getPostedDate(); // Fallback for old data

            if (lastSeen != null && lastSeen.isBefore(expiredThreshold)) {
                job.setStatus(Job.JobStatus.EXPIRED);
                jobRepository.save(job);
                expiredCount++;
            } else if (lastSeen != null && lastSeen.isBefore(staleThreshold)
                       && job.getStatus() == Job.JobStatus.ACTIVE) {
                job.setStatus(Job.JobStatus.STALE);
                jobRepository.save(job);
                staleCount++;
            }
        }

        log.info("Lifecycle sweep complete: {} jobs marked STALE, {} jobs marked EXPIRED", staleCount, expiredCount);
    }

    // ─── Deduplication ───────────────────────────────────────

    /**
     * Ensures a list of jobs has unique IDs, keeping the one with the highest match score.
     * Sorted by score descending.
     */
    public List<Job> deduplicateJobs(List<Job> jobs) {
        if (jobs == null) return List.of();

        return jobs.stream()
                .filter(Objects::nonNull)
                .filter(job -> job.getId() != null)
                .collect(Collectors.toMap(
                    Job::getId,
                    job -> job,
                    (existing, replacement) -> {
                        double s1 = existing.getMatchScore() != null ? existing.getMatchScore() : 0.0;
                        double s2 = replacement.getMatchScore() != null ? replacement.getMatchScore() : 0.0;
                        return s1 >= s2 ? existing : replacement;
                    },
                    LinkedHashMap::new
                ))
                .values()
                .stream()
                .sorted((a, b) -> {
                    double s1 = a.getMatchScore() != null ? a.getMatchScore() : 0.0;
                    double s2 = b.getMatchScore() != null ? b.getMatchScore() : 0.0;
                    return Double.compare(s2, s1);
                })
                .collect(Collectors.toList());
    }

    // ─── Purge & Reindex ─────────────────────────────────────

    /**
     * Purge all jobs for a specific user. Also evicts their score cache.
     */
    @org.springframework.cache.annotation.Caching(evict = {
        @org.springframework.cache.annotation.CacheEvict(value = "jobDashboard", key = "#userId"),
        @org.springframework.cache.annotation.CacheEvict(value = "recommendedJobs", key = "#userId"),
        @org.springframework.cache.annotation.CacheEvict(value = "jobCatalog", key = "#userId")
    })
    public void purgeJobsForUser(String userId) {
        log.info("Purging all jobs for user: {}", userId);
        jobRepository.deleteAllByUserId(userId);
        scoreCache.evictUser(userId);
    }

    public void purgeAllJobs() {
        log.info("Purging all existing jobs from database and vector store...");
        jobRepository.deleteAll();
        recommendationAgent.clearVectorStore();
    }

    public void reindexAllJobs() {
        log.info("Starting full re-indexing of all jobs...");
        List<Job> allJobs = jobRepository.findAll();
        allJobs.forEach(recommendationAgent::indexJob);
        log.info("Re-indexing of {} jobs completed.", allJobs.size());
    }
}
