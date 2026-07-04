package com.aicareerforge.service;

import com.aicareerforge.model.Job;
import com.aicareerforge.repository.JobRepository;
import lombok.Builder;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Admin-facing service for job oversight, stats aggregation,
 * manual sync triggers, and bulk lifecycle operations.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class JobAdminService {

    private final JobRepository jobRepository;
    private final JobCatalogService catalogService;
    private final JobSyncOrchestrator syncOrchestrator;
    private final JobRecommendationAgent recommendationAgent;

    // ─── Sync Metadata ───────────────────────────────────────

    @Data
    @Builder
    public static class SyncResult {
        private LocalDateTime startedAt;
        private LocalDateTime completedAt;
        private long durationMs;
        private int totalFetched;
        private int newSaved;
        private int duplicatesSkipped;
        private int errors;
        private Map<String, Integer> perSourceBreakdown;
    }

    private volatile SyncResult lastSyncResult;
    private volatile boolean syncInProgress = false;

    public SyncResult getLastSyncResult() {
        return lastSyncResult;
    }

    public boolean isSyncInProgress() {
        return syncInProgress;
    }

    // ─── Stats ───────────────────────────────────────────────

    public Map<String, Object> getJobStats() {
        Map<String, Object> stats = new LinkedHashMap<>();

        stats.put("totalJobs", jobRepository.count());

        // Status breakdown
        Map<String, Long> statusCounts = new LinkedHashMap<>();
        statusCounts.put("ACTIVE", jobRepository.countByStatus(Job.JobStatus.ACTIVE));
        statusCounts.put("STALE", jobRepository.countByStatus(Job.JobStatus.STALE));
        statusCounts.put("EXPIRED", jobRepository.countByStatus(Job.JobStatus.EXPIRED));
        stats.put("statusBreakdown", statusCounts);

        // Source breakdown
        Map<String, Long> sourceCounts = new LinkedHashMap<>();
        sourceCounts.put("adzuna", jobRepository.countBySource("adzuna"));
        sourceCounts.put("remotive", jobRepository.countBySource("remotive"));
        sourceCounts.put("jsearch", jobRepository.countBySource("jsearch"));
        sourceCounts.put("local", jobRepository.countBySource("local"));
        stats.put("sourceBreakdown", sourceCounts);

        // Sync metadata
        stats.put("syncInProgress", syncInProgress);
        if (lastSyncResult != null) {
            stats.put("lastSync", lastSyncResult);
        }

        return stats;
    }

    // ─── Paginated Browsing ──────────────────────────────────

    public Page<Job> browseJobs(String status, String source, String search, int page, int size) {
        PageRequest pageRequest = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "postedDate"));

        // If search is provided, use text search
        if (search != null && !search.isBlank()) {
            return jobRepository.searchJobs(search, pageRequest);
        }

        // Filter by status + source
        Job.JobStatus jobStatus = parseStatus(status);
        boolean hasSource = source != null && !source.isBlank();

        if (jobStatus != null && hasSource) {
            return jobRepository.findByStatusAndSource(jobStatus, source, pageRequest);
        } else if (jobStatus != null) {
            return jobRepository.findByStatus(jobStatus, pageRequest);
        } else if (hasSource) {
            return jobRepository.findBySource(source, pageRequest);
        }

        return jobRepository.findAll(pageRequest);
    }

    // ─── Admin Actions ───────────────────────────────────────

    @Async
    public void triggerManualSync() {
        if (syncInProgress) {
            log.warn("Manual sync requested but a sync is already in progress. Skipping.");
            return;
        }

        syncInProgress = true;
        LocalDateTime start = LocalDateTime.now();
        long startMs = System.currentTimeMillis();

        try {
            log.info("Admin triggered manual job sync.");
            syncOrchestrator.scheduledJobSync();

            long durationMs = System.currentTimeMillis() - startMs;
            lastSyncResult = SyncResult.builder()
                    .startedAt(start)
                    .completedAt(LocalDateTime.now())
                    .durationMs(durationMs)
                    .build();

            log.info("Admin manual sync completed in {}ms", durationMs);
        } catch (Exception e) {
            log.error("Admin manual sync failed: {}", e.getMessage());
        } finally {
            syncInProgress = false;
        }
    }

    public void reindexVectorStore() {
        log.info("Admin triggered vector store re-index.");
        catalogService.reindexAllJobs();
    }

    public long purgeExpiredJobs() {
        log.info("Admin triggered purge of expired jobs.");
        long count = jobRepository.deleteByStatus(Job.JobStatus.EXPIRED);
        log.info("Purged {} expired jobs.", count);
        return count;
    }

    public void deleteJob(String jobId) {
        log.info("Admin deleting job: {}", jobId);
        jobRepository.deleteById(jobId);
    }

    public void purgeAllJobs() {
        log.info("Admin triggered NUCLEAR purge of all jobs.");
        catalogService.purgeAllJobs();
    }

    // ─── Helpers ─────────────────────────────────────────────

    private Job.JobStatus parseStatus(String status) {
        if (status == null || status.isBlank()) return null;
        try {
            return Job.JobStatus.valueOf(status.toUpperCase());
        } catch (IllegalArgumentException e) {
            return null;
        }
    }
}
