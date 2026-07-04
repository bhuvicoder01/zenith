package com.aicareerforge.service;

import com.aicareerforge.dto.RemotiveJobResponse;
import com.aicareerforge.event.JobsSyncedEvent;
import com.aicareerforge.model.Job;
import com.aicareerforge.repository.JobRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Multi-source job sync orchestrator with parallel fetching.
 *
 * Sources (9 total, priority-ordered):
 *   1. LinkedIn      (PRIMARY — fetched first, highest result count, higher circuit breaker tolerance)
 *   2. Indeed         (via RapidAPI)
 *   3. Glassdoor      (via RapidAPI)
 *   4. JSearch        (via RapidAPI — aggregates multiple boards)
 *   5. Adzuna         (direct API)
 *   6. Remotive       (free public API)
 *   7. The Muse       (free public API)
 *   8. Arbeitnow      (free public API)
 *   9. USAJobs        (free gov API)
 *
 * Architecture:
 *   - LinkedIn runs FIRST (blocking) to guarantee primary data is always captured.
 *   - All other sources run in PARALLEL via CompletableFuture.
 *   - Circuit breaker skips a source after N consecutive failures.
 *   - Domain events published after each sync batch.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class JobSyncOrchestrator {

    // ─── Source Clients ──────────────────────────────────────
    private final LinkedInJobsClient linkedInClient;
    private final AdzunaClient adzunaClient;
    private final RemotiveClient remotiveClient;
    private final JSearchClient jSearchClient;
    private final IndeedClient indeedClient;
    private final GlassdoorClient glassdoorClient;
    private final TheMuseClient theMuseClient;
    private final ArbeitnowClient arbeitnowClient;
    private final UsaJobsClient usaJobsClient;

    // ─── Pipeline Services ───────────────────────────────────
    private final JobNormalizationService normalizationService;
    private final JobCatalogService catalogService;
    private final JobEnrichmentService enrichmentService;
    private final CompanyIntelligenceService companyIntelligenceService;
    private final JobRepository jobRepository;
    private final ApplicationEventPublisher eventPublisher;
    private final JobSyncAgent jobSyncAgent;

    // ─── Parallel Execution Infrastructure ───────────────────
    private final ExecutorService syncExecutor = Executors.newFixedThreadPool(10,
            r -> { Thread t = new Thread(r, "job-sync-worker"); t.setDaemon(true); return t; });

    private final ConcurrentHashMap<String, AtomicInteger> sourceFailureCounts = new ConcurrentHashMap<>();
    private static final int CIRCUIT_BREAKER_THRESHOLD = 3;
    private static final int LINKEDIN_CIRCUIT_THRESHOLD = 5; // Higher tolerance for primary source

    // ════════════════════════════════════════════════════════════
    //  INDIVIDUAL SOURCE SYNC METHODS
    // ════════════════════════════════════════════════════════════

    // ─── LinkedIn (PRIMARY) ──────────────────────────────────

    public List<Job> fetchAndSyncLinkedInJobs(String keyword, String location, String userId) {
        log.info("[PRIMARY] Syncing LinkedIn jobs for: '{}', location: '{}', user: {}", keyword, location, userId);
        var dtos = linkedInClient.searchJobs(keyword, location, 25);

        List<Job> synced = new ArrayList<>();
        for (var dto : dtos) {
            String sourceJobId = "linkedin-" + dto.getJobId();
            if (catalogService.exists(sourceJobId, userId)) continue;

            Job job = normalizationService.fromLinkedIn(dto, userId);
            enrichmentService.enrichAndIndexJobAsync(job);
            Job saved = catalogService.saveJob(job);
            if (saved != null) synced.add(saved);
        }

        log.info("[PRIMARY] Synced {} new LinkedIn jobs for user {}", synced.size(), userId);
        if (!synced.isEmpty()) {
            eventPublisher.publishEvent(new JobsSyncedEvent(this, userId, keyword, synced.size(), List.of("linkedin")));
        }
        return synced;
    }

    // ─── Adzuna ──────────────────────────────────────────────

    public List<Job> fetchAndSyncAdzunaJobs(String keyword, String location, String userId) {
        log.info("Syncing Adzuna jobs for: '{}', location: '{}', user: {}", keyword, location, userId);
        var dtos = adzunaClient.searchJobs(keyword, location, 1);

        List<Job> synced = new ArrayList<>();
        for (var dto : dtos) {
            String sourceJobId = "adzuna-" + dto.getId();
            if (catalogService.exists(sourceJobId, userId)) continue;

            Job job = normalizationService.fromAdzuna(dto, userId);
            enrichmentService.enrichAndIndexJobAsync(job);
            Job saved = catalogService.saveJob(job);
            if (saved != null) synced.add(saved);
        }

        if (!synced.isEmpty()) {
            eventPublisher.publishEvent(new JobsSyncedEvent(this, userId, keyword, synced.size(), List.of("adzuna")));
        }
        return synced;
    }

    // ─── Remotive ────────────────────────────────────────────

    public List<Job> fetchAndSyncRemotiveJobs(String keyword, String userId) {
        log.info("Syncing Remotive jobs for: '{}', user: {}", keyword, userId);
        var dtos = remotiveClient.searchJobs(keyword, "software-dev", 15);

        List<Job> synced = new ArrayList<>();
        for (RemotiveJobResponse.RemotiveJobDto dto : dtos) {
            String sourceJobId = "remotive-" + dto.getId();
            if (catalogService.exists(sourceJobId, userId)) continue;

            Job job = normalizationService.fromRemotive(dto, userId);
            enrichmentService.enrichAndIndexJobAsync(job);
            Job saved = catalogService.saveJob(job);
            if (saved != null) synced.add(saved);
        }

        if (!synced.isEmpty()) {
            eventPublisher.publishEvent(new JobsSyncedEvent(this, userId, keyword, synced.size(), List.of("remotive")));
        }
        return synced;
    }

    // ─── JSearch ─────────────────────────────────────────────

    public List<Job> fetchAndSyncJSearchJobs(String keyword, String location, String userId) {
        log.info("Syncing JSearch jobs for: '{}', location: '{}', user: {}", keyword, location, userId);
        var dtos = jSearchClient.searchJobs(keyword, location, 1);

        List<Job> synced = new ArrayList<>();
        for (var dto : dtos) {
            String sourceJobId = "jsearch-" + dto.getJobId();
            if (catalogService.exists(sourceJobId, userId)) continue;

            Job job = normalizationService.fromJSearch(dto, userId);
            enrichmentService.enrichAndIndexJobAsync(job);
            Job saved = catalogService.saveJob(job);
            if (saved != null) synced.add(saved);
        }

        if (!synced.isEmpty()) {
            eventPublisher.publishEvent(new JobsSyncedEvent(this, userId, keyword, synced.size(), List.of("jsearch")));
        }
        return synced;
    }

    // ─── Indeed ──────────────────────────────────────────────

    public List<Job> fetchAndSyncIndeedJobs(String keyword, String location, String userId) {
        log.info("Syncing Indeed jobs for: '{}', location: '{}', user: {}", keyword, location, userId);
        var dtos = indeedClient.searchJobs(keyword, location, 15);

        List<Job> synced = new ArrayList<>();
        for (var dto : dtos) {
            String sourceJobId = "indeed-" + dto.getJobId();
            if (catalogService.exists(sourceJobId, userId)) continue;

            Job job = normalizationService.fromIndeed(dto, userId);
            enrichmentService.enrichAndIndexJobAsync(job);
            Job saved = catalogService.saveJob(job);
            if (saved != null) synced.add(saved);
        }

        if (!synced.isEmpty()) {
            eventPublisher.publishEvent(new JobsSyncedEvent(this, userId, keyword, synced.size(), List.of("indeed")));
        }
        return synced;
    }

    // ─── Glassdoor ───────────────────────────────────────────

    public List<Job> fetchAndSyncGlassdoorJobs(String keyword, String location, String userId) {
        log.info("Syncing Glassdoor jobs for: '{}', location: '{}', user: {}", keyword, location, userId);
        var dtos = glassdoorClient.searchJobs(keyword, location, 15);

        List<Job> synced = new ArrayList<>();
        for (var dto : dtos) {
            String sourceJobId = "glassdoor-" + dto.getJobId();
            if (catalogService.exists(sourceJobId, userId)) continue;

            Job job = normalizationService.fromGlassdoor(dto, userId);
            enrichmentService.enrichAndIndexJobAsync(job);
            Job saved = catalogService.saveJob(job);
            if (saved != null) synced.add(saved);
        }

        if (!synced.isEmpty()) {
            eventPublisher.publishEvent(new JobsSyncedEvent(this, userId, keyword, synced.size(), List.of("glassdoor")));
        }
        return synced;
    }

    // ─── The Muse ────────────────────────────────────────────

    public List<Job> fetchAndSyncTheMuseJobs(String userId) {
        log.info("Syncing The Muse jobs for user: {}", userId);
        var dtos = theMuseClient.searchJobs("Software Engineer", 0, 15);

        List<Job> synced = new ArrayList<>();
        for (var dto : dtos) {
            String sourceJobId = "themuse-" + dto.getId();
            if (catalogService.exists(sourceJobId, userId)) continue;

            Job job = normalizationService.fromTheMuse(dto, userId);
            enrichmentService.enrichAndIndexJobAsync(job);
            Job saved = catalogService.saveJob(job);
            if (saved != null) synced.add(saved);
        }

        if (!synced.isEmpty()) {
            eventPublisher.publishEvent(new JobsSyncedEvent(this, userId, "themuse", synced.size(), List.of("themuse")));
        }
        return synced;
    }

    // ─── Arbeitnow ───────────────────────────────────────────

    public List<Job> fetchAndSyncArbeitnowJobs(String userId) {
        log.info("Syncing Arbeitnow jobs for user: {}", userId);
        var dtos = arbeitnowClient.searchJobs(1, 15);

        List<Job> synced = new ArrayList<>();
        for (var dto : dtos) {
            String sourceJobId = "arbeitnow-" + dto.getSlug();
            if (catalogService.exists(sourceJobId, userId)) continue;

            Job job = normalizationService.fromArbeitnow(dto, userId);
            enrichmentService.enrichAndIndexJobAsync(job);
            Job saved = catalogService.saveJob(job);
            if (saved != null) synced.add(saved);
        }

        if (!synced.isEmpty()) {
            eventPublisher.publishEvent(new JobsSyncedEvent(this, userId, "arbeitnow", synced.size(), List.of("arbeitnow")));
        }
        return synced;
    }

    // ─── USAJobs ─────────────────────────────────────────────

    public List<Job> fetchAndSyncUsaJobs(String keyword, String userId) {
        log.info("Syncing USAJobs for: '{}', user: {}", keyword, userId);
        var items = usaJobsClient.searchJobs(keyword, null, 15);

        List<Job> synced = new ArrayList<>();
        for (var item : items) {
            String sourceJobId = "usajobs-" + item.getMatchedObjectId();
            if (catalogService.exists(sourceJobId, userId)) continue;

            Job job = normalizationService.fromUsaJobs(item, userId);
            enrichmentService.enrichAndIndexJobAsync(job);
            Job saved = catalogService.saveJob(job);
            if (saved != null) synced.add(saved);
        }

        if (!synced.isEmpty()) {
            eventPublisher.publishEvent(new JobsSyncedEvent(this, userId, keyword, synced.size(), List.of("usajobs")));
        }
        return synced;
    }

    // ─── Legacy Global Sync (backward compat) ────────────────

    public List<Job> fetchAndSyncJobs(String keyword, String location) {
        log.info("Legacy sync for: '{}', location: '{}'", keyword, location);
        var adzunaJobs = adzunaClient.searchJobs(keyword, location, 1);

        List<Job> synced = new ArrayList<>();
        for (var dto : adzunaJobs) {
            String sourceJobId = "adzuna-" + dto.getId();
            Job job = normalizationService.fromAdzuna(dto, null);

            if (!jobRepository.existsBySourceJobId(sourceJobId)) {
                try {
                    job.setCultureAnalysis(companyIntelligenceService.fetchCultureInsights(job.getCompany(), job.getTitle()));
                    CompanyIntelligenceService.LogoMetaData logoMeta = companyIntelligenceService.findCompanyLogoUrl(job.getCompany());
                    job.setCompanyLogoUrl(logoMeta.url());
                    job.setCompanyLogoTheme(logoMeta.theme());
                } catch (Exception e) {
                    log.error("Failed to enrich legacy job: {}", e.getMessage());
                }
            }

            Job saved = catalogService.saveJob(job);
            if (saved != null) synced.add(saved);
        }

        if (!synced.isEmpty()) {
            eventPublisher.publishEvent(new JobsSyncedEvent(this, null, keyword, synced.size(), List.of("adzuna")));
        }
        return synced;
    }

    // ════════════════════════════════════════════════════════════
    //  SCHEDULED UNIVERSAL SYNC — LINKEDIN-FIRST PARALLEL
    // ════════════════════════════════════════════════════════════

    /**
     * Every 4 hours: fetch from ALL 9 sources across dynamically generated keywords.
     *
     * Strategy:
     *   Phase 1: LinkedIn (PRIMARY) runs FIRST synchronously per keyword — guaranteed data.
     *   Phase 2: All other 8 sources run in PARALLEL via CompletableFuture.
     *   Circuit breaker skips sources after consecutive failures.
     */
    @Scheduled(cron = "0 0 */4 * * *")
    public void scheduledJobSync() {
        log.info("═══ Starting 9-source parallel job sync (LinkedIn-first strategy) ═══");
        long startMs = System.currentTimeMillis();

        sourceFailureCounts.clear();

        List<String> keywords = jobSyncAgent.generateDynamicKeywords();

        // Phase 0: Non-keyword sources (run once, parallel)
        List<CompletableFuture<Void>> globalFutures = new ArrayList<>();
        if (!isCircuitOpen("themuse")) {
            globalFutures.add(runSource("themuse", () -> fetchAndSyncTheMuseJobs(null)));
        }
        if (!isCircuitOpen("arbeitnow")) {
            globalFutures.add(runSource("arbeitnow", () -> fetchAndSyncArbeitnowJobs(null)));
        }
        awaitAll(globalFutures, "global non-keyword sources");

        // Phase 1 & 2: Per-keyword sync
        for (String keyword : keywords) {
            try {
                // PHASE 1: LinkedIn FIRST (synchronous — guaranteed primary data)
                if (!isCircuitOpen("linkedin")) {
                    try {
                        fetchAndSyncLinkedInJobs(keyword, "", null);
                        resetFailure("linkedin");
                    } catch (Exception e) {
                        recordFailure("linkedin", e);
                    }
                }

                // PHASE 2: All secondary sources in PARALLEL
                List<CompletableFuture<Void>> futures = new ArrayList<>();

                if (!isCircuitOpen("indeed"))
                    futures.add(runSource("indeed", () -> fetchAndSyncIndeedJobs(keyword, "", null)));
                if (!isCircuitOpen("glassdoor"))
                    futures.add(runSource("glassdoor", () -> fetchAndSyncGlassdoorJobs(keyword, "", null)));
                if (!isCircuitOpen("jsearch"))
                    futures.add(runSource("jsearch", () -> fetchAndSyncJSearchJobs(keyword, "Remote", null)));
                if (!isCircuitOpen("adzuna"))
                    futures.add(runSource("adzuna", () -> fetchAndSyncAdzunaJobs(keyword, "", null)));
                if (!isCircuitOpen("remotive"))
                    futures.add(runSource("remotive", () -> fetchAndSyncRemotiveJobs(keyword, null)));
                if (!isCircuitOpen("usajobs"))
                    futures.add(runSource("usajobs", () -> fetchAndSyncUsaJobs(keyword, null)));

                awaitAll(futures, "keyword '" + keyword + "'");

                Thread.sleep(500); // Inter-keyword cooldown
            } catch (Exception e) {
                log.error("Failed sync cycle for keyword '{}': {}", keyword, e.getMessage());
            }
        }

        long durationMs = System.currentTimeMillis() - startMs;
        log.info("═══ 9-source parallel sync completed in {}ms ({} keywords) ═══", durationMs, keywords.size());
    }

    // ════════════════════════════════════════════════════════════
    //  CIRCUIT BREAKER & PARALLEL HELPERS
    // ════════════════════════════════════════════════════════════

    private CompletableFuture<Void> runSource(String source, Runnable task) {
        return CompletableFuture.runAsync(() -> {
            try {
                task.run();
                resetFailure(source);
            } catch (Exception e) {
                recordFailure(source, e);
            }
        }, syncExecutor);
    }

    private void awaitAll(List<CompletableFuture<Void>> futures, String label) {
        try {
            CompletableFuture.allOf(futures.toArray(new CompletableFuture[0]))
                    .get(45, TimeUnit.SECONDS);
        } catch (TimeoutException te) {
            log.warn("Timeout waiting for {}", label);
        } catch (Exception e) {
            log.error("Error waiting for {}: {}", label, e.getMessage());
        }
    }

    private boolean isCircuitOpen(String source) {
        int threshold = "linkedin".equals(source) ? LINKEDIN_CIRCUIT_THRESHOLD : CIRCUIT_BREAKER_THRESHOLD;
        AtomicInteger failures = sourceFailureCounts.get(source);
        if (failures != null && failures.get() >= threshold) {
            log.warn("Circuit OPEN for '{}' ({}/{} failures)", source, failures.get(), threshold);
            return true;
        }
        return false;
    }

    private void recordFailure(String source, Exception e) {
        int count = sourceFailureCounts.computeIfAbsent(source, k -> new AtomicInteger(0)).incrementAndGet();
        log.error("'{}' failed (#{}/{}): {}", source, count,
                "linkedin".equals(source) ? LINKEDIN_CIRCUIT_THRESHOLD : CIRCUIT_BREAKER_THRESHOLD, e.getMessage());
    }

    private void resetFailure(String source) {
        sourceFailureCounts.remove(source);
    }
}
