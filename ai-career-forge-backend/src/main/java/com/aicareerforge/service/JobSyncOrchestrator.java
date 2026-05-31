package com.aicareerforge.service;

import com.aicareerforge.dto.RemotiveJobResponse;
import com.aicareerforge.event.JobsSyncedEvent;
import com.aicareerforge.model.Job;
import com.aicareerforge.repository.JobRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Coordinates multi-source job fetching from external APIs.
 * Each source connector is isolated (Adzuna/Remotive/JSearch), and jobs are
 * normalized via {@link JobNormalizationService} before being saved via {@link JobCatalogService}.
 *
 * Publishes {@link JobsSyncedEvent} domain events after each sync batch,
 * enabling decoupled listeners for cache refresh, notifications, and analytics.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class JobSyncOrchestrator {

    private final AdzunaClient adzunaClient;
    private final RemotiveClient remotiveClient;
    private final JSearchClient jSearchClient;
    private final JobNormalizationService normalizationService;
    private final JobCatalogService catalogService;
    private final JobEnrichmentService enrichmentService;
    private final CompanyIntelligenceService companyIntelligenceService;
    private final JobRepository jobRepository;
    private final ApplicationEventPublisher eventPublisher;

    // ─── Adzuna ──────────────────────────────────────────────

    /**
     * Fetch jobs from Adzuna and save them scoped to a specific user.
     */
    public List<Job> fetchAndSyncAdzunaJobs(String keyword, String location, String userId) {
        log.info("Fetching and syncing Adzuna jobs for keyword: '{}', location: '{}', user: {}", keyword, location, userId);

        var adzunaJobs = adzunaClient.searchJobs(keyword, location, 1);

        List<Job> syncedJobs = new ArrayList<>();
        for (var dto : adzunaJobs) {
            String sourceJobId = "adzuna-" + dto.getId();

            if (catalogService.exists(sourceJobId, userId)) continue;

            Job job = normalizationService.fromAdzuna(dto, userId);
            enrichmentService.enrichAndIndexJobAsync(job);

            Job saved = catalogService.saveJob(job);
            if (saved != null) syncedJobs.add(saved);
        }

        log.info("Successfully synced {} new Adzuna jobs for user {}", syncedJobs.size(), userId);

        // Publish domain event
        if (!syncedJobs.isEmpty()) {
            eventPublisher.publishEvent(new JobsSyncedEvent(this, userId, keyword, syncedJobs.size(), List.of("adzuna")));
        }

        return syncedJobs;
    }

    // ─── Remotive ────────────────────────────────────────────

    /**
     * Fetch remote jobs from Remotive and save them scoped to a specific user.
     */
    public List<Job> fetchAndSyncRemotiveJobs(String keyword, String userId) {
        log.info("Fetching and syncing Remotive jobs for keyword: '{}', user: {}", keyword, userId);

        var remotiveJobs = remotiveClient.searchJobs(keyword, "software-dev", 15);

        List<Job> syncedJobs = new ArrayList<>();
        for (RemotiveJobResponse.RemotiveJobDto dto : remotiveJobs) {
            String sourceJobId = "remotive-" + dto.getId();

            if (catalogService.exists(sourceJobId, userId)) continue;

            Job job = normalizationService.fromRemotive(dto, userId);
            enrichmentService.enrichAndIndexJobAsync(job);

            Job saved = catalogService.saveJob(job);
            if (saved != null) syncedJobs.add(saved);
        }

        log.info("Successfully synced {} new Remotive jobs for user {}", syncedJobs.size(), userId);

        if (!syncedJobs.isEmpty()) {
            eventPublisher.publishEvent(new JobsSyncedEvent(this, userId, keyword, syncedJobs.size(), List.of("remotive")));
        }

        return syncedJobs;
    }

    // ─── JSearch ─────────────────────────────────────────────

    /**
     * Fetch jobs from JSearch (RapidAPI) and save them scoped to a specific user.
     */
    public List<Job> fetchAndSyncJSearchJobs(String keyword, String location, String userId) {
        log.info("Fetching and syncing JSearch jobs for keyword: '{}', location: '{}', user: {}", keyword, location, userId);

        var jSearchJobs = jSearchClient.searchJobs(keyword, location, 1);

        List<Job> syncedJobs = new ArrayList<>();
        for (var dto : jSearchJobs) {
            String sourceJobId = "jsearch-" + dto.getJobId();

            if (catalogService.exists(sourceJobId, userId)) continue;

            Job job = normalizationService.fromJSearch(dto, userId);
            enrichmentService.enrichAndIndexJobAsync(job);

            Job saved = catalogService.saveJob(job);
            if (saved != null) syncedJobs.add(saved);
        }

        log.info("Successfully synced {} new JSearch jobs for user {}", syncedJobs.size(), userId);

        if (!syncedJobs.isEmpty()) {
            eventPublisher.publishEvent(new JobsSyncedEvent(this, userId, keyword, syncedJobs.size(), List.of("jsearch")));
        }

        return syncedJobs;
    }

    // ─── Legacy Global Sync ──────────────────────────────────

    /**
     * Legacy method for manual search — global (no userId) for ad-hoc queries.
     */
    public List<Job> fetchAndSyncJobs(String keyword, String location) {
        log.info("Fetching and syncing real jobs for keyword: {} and location: {}", keyword, location);

        var adzunaJobs = adzunaClient.searchJobs(keyword, location, 1);

        List<Job> syncedJobs = new ArrayList<>();
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
                    log.error("Failed to enrich job with culture insights/logo: {}", e.getMessage());
                }
            }

            Job saved = catalogService.saveJob(job);
            if (saved != null) syncedJobs.add(saved);
        }

        log.info("Successfully synced {} new jobs from Adzuna", syncedJobs.size());

        if (!syncedJobs.isEmpty()) {
            eventPublisher.publishEvent(new JobsSyncedEvent(this, null, keyword, syncedJobs.size(), List.of("adzuna")));
        }

        return syncedJobs;
    }

    // ─── Scheduled Universal Sync ────────────────────────────

    /**
     * Every 4 hours: fetch from all sources across 19 popular keywords.
     * Jobs are saved to the global pool (userId = null).
     */
    @Scheduled(cron = "0 0 */4 * * *")
    public void scheduledJobSync() {
        log.info("Starting scheduled universal job sync...");

        List<String> keywords = List.of(
            "Software Engineer", "Frontend Developer", "Backend Developer", "Fullstack Developer",
            "Data Scientist", "AI Engineer", "Machine Learning Engineer", "DevOps Engineer",
            "Product Manager", "UI/UX Designer", "Cybersecurity Analyst", "Cloud Architect",
            "Mobile Developer", "Java Developer", "Python Developer", "React Developer",
            "Node.js Developer", "Embedded Systems Engineer", "Quality Assurance Engineer"
        );

        for (String keyword : keywords) {
            try {
                fetchAndSyncAdzunaJobs(keyword, "", null);
                fetchAndSyncRemotiveJobs(keyword, null);
                fetchAndSyncJSearchJobs(keyword, "Remote", null);

                // Throttle slightly to avoid aggressive rate limiting
                Thread.sleep(2000);
            } catch (Exception e) {
                log.error("Failed universal sync for keyword {}: {}", keyword, e.getMessage());
            }
        }
        log.info("Scheduled universal job sync completed.");
    }

    /**
     * Trigger initial job sync asynchronously at server startup.
     */
    // @Async
    // @EventListener(ApplicationReadyEvent.class)
    // public void onApplicationReady() {
    //     log.info("Application ready. Triggering initial job sync at startup...");
    //     scheduledJobSync();
    // }
}
