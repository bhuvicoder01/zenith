package com.aicareerforge.controller;

import com.aicareerforge.model.Job;
import com.aicareerforge.model.JobDetailResponse;
import com.aicareerforge.model.JobSyncStatus;
import com.aicareerforge.model.User;
import com.aicareerforge.model.UserActivity;
import com.aicareerforge.model.UserProfile;
import com.aicareerforge.model.Application;
import com.aicareerforge.repository.ApplicationRepository;
import com.aicareerforge.service.JobService;
import com.aicareerforge.service.JobSyncService;
import com.aicareerforge.service.PersonalizedJobService;
import com.aicareerforge.service.SyncSseEmitterRegistry;
import com.aicareerforge.service.UserProfileService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/v1/jobs")
@RequiredArgsConstructor
public class JobController {

    private final JobService jobService;
    private final UserProfileService userProfileService;
    private final JobSyncService jobSyncService;
    private final SyncSseEmitterRegistry sseRegistry;
    private final PersonalizedJobService personalizedJobService;
    private final ApplicationRepository applicationRepository;

    @GetMapping("/public")
    public ResponseEntity<List<Job>> getPublicJobs() {
        return ResponseEntity.ok(jobService.getRecentJobs());
    }

    @GetMapping("/dashboard")
    public ResponseEntity<PersonalizedJobService.JobDashboardResponse> getJobDashboard(@AuthenticationPrincipal User user) {
        UserProfile profile = userProfileService.getProfile(user.getId());
        return ResponseEntity.ok(personalizedJobService.getPersonalizedDashboard(profile));
    }

    @PostMapping("/{id}/track")
    public ResponseEntity<Void> trackActivity(
            @PathVariable String id,
            @RequestParam UserActivity.ActivityType type,
            @AuthenticationPrincipal User user) {
        personalizedJobService.trackActivity(user.getId(), type, id, null);
        return ResponseEntity.ok().build();
    }

    @GetMapping
    public ResponseEntity<Page<Job>> getJobs(@RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size, @AuthenticationPrincipal User user) {
        if (user != null) {
            personalizedJobService.trackActivity(user.getId(), UserActivity.ActivityType.SEARCH, null, "Page " + page);
        }
        return ResponseEntity.ok(jobService.getJobs(page, size));
    }

    @GetMapping("/recommended")
    public ResponseEntity<List<Job>> getRecommendedJobs(@AuthenticationPrincipal User user) {
        try {
            UserProfile profile = userProfileService.getProfile(user.getId());
            return ResponseEntity.ok(jobService.getRecommendedJobs(profile));
        } catch (Exception e) {
            // Absolute safety net — never return 500 for recommendations
            return ResponseEntity.ok(List.of());
        }
    }

    @GetMapping("/catalog")
    public ResponseEntity<List<Job>> getJobCatalog(@AuthenticationPrincipal User user) {
        try {
            if (user == null) return ResponseEntity.status(401).build();
            UserProfile profile = userProfileService.getProfile(user.getId());
            if (profile == null) return ResponseEntity.ok(List.of());
            return ResponseEntity.ok(jobService.getJobCatalog(profile));
        } catch (Exception e) {
            log.error("Failed to fetch job catalog for user {}: {}", user != null ? user.getId() : "null", e.getMessage(), e);
            return ResponseEntity.status(500).build();
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<JobDetailResponse> getJob(@PathVariable String id, @AuthenticationPrincipal User user) {
        Job job = jobService.getJobById(id);
        if (job == null) return ResponseEntity.notFound().build();
        
        UserProfile profile = userProfileService.getProfile(user.getId());
        List<String> matchedSkills = jobService.detectMatchedSkills(job, String.join(", ", profile.getSkills()));
        
        // Load cached relevance explanation if present, avoiding blocking generation
        String cachedRelevance = jobService.getCachedRelevanceExplanation(id, user.getId());
        if (cachedRelevance != null && !cachedRelevance.isBlank()) {
            job.setRelevanceExplanation(cachedRelevance);
        }
        
        // Priority: Cached Score (from list view) > Fresh Calculation (baseline)
        Double score = jobService.getCachedScore(user.getId(), id);
        if (score == null) {
            score = jobService.calculateMatchScore(job, profile, 0.7); // Baseline fallback
        }
        
        List<Application> existingApps = applicationRepository.findByUserIdAndJobId(user.getId(), id);
        return ResponseEntity.ok(new JobDetailResponse(job, matchedSkills, score, existingApps));
    }

    @GetMapping("/{id}/culture")
    public ResponseEntity<java.util.Map<String, String>> getCultureInsights(@PathVariable String id) {
        try {
            String culture = jobService.generateAndSaveCultureInsights(id);
            return ResponseEntity.ok(java.util.Map.of("culture", culture != null ? culture : ""));
        } catch (Exception e) {
            log.error("Failed to fetch/generate culture insights for job {}: {}", id, e.getMessage());
            return ResponseEntity.status(500).body(java.util.Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/{id}/relevance")
    public ResponseEntity<java.util.Map<String, String>> getRelevanceExplanation(
            @PathVariable String id, 
            @AuthenticationPrincipal User user) {
        try {
            UserProfile profile = userProfileService.getProfile(user.getId());
            String explanation = jobService.generateAndSaveRelevanceExplanation(id, profile);
            return ResponseEntity.ok(java.util.Map.of("relevance", explanation != null ? explanation : ""));
        } catch (Exception e) {
            log.error("Failed to fetch/generate relevance explanation for job {}: {}", id, e.getMessage());
            return ResponseEntity.status(500).body(java.util.Map.of("error", e.getMessage()));
        }
    }


    @GetMapping("/search")
    public ResponseEntity<List<Job>> searchAndSyncJobs(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String l,
            @AuthenticationPrincipal User user) {
        // User-scoped search: pass userId to scope jobs to the authenticated user
        String userId = (user != null) ? user.getId() : null;
        if (userId != null) {
            List<Job> adzunaJobs = jobService.fetchAndSyncAdzunaJobs(q, l, userId);
            List<Job> remotiveJobs = jobService.fetchAndSyncRemotiveJobs(q, userId);
            adzunaJobs.addAll(remotiveJobs);
            return ResponseEntity.ok(adzunaJobs);
        } else {
            return ResponseEntity.ok(jobService.fetchAndSyncJobs(q, l));
        }
    }

    @PostMapping("/reindex")
    public ResponseEntity<String> reindexJobs() {
        jobService.reindexAllJobs();
        return ResponseEntity.ok("Full re-indexing triggered.");
    }

    @GetMapping("/sync-status")
    public ResponseEntity<JobSyncStatus> getSyncStatus(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(jobSyncService.getSyncStatus(user.getId()));
    }

    @GetMapping(value = "/sync-stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter streamSyncStatus(@AuthenticationPrincipal User user) {
        SseEmitter emitter = sseRegistry.createEmitter(user.getId());
        // Send the current status immediately so the client knows where things stand
        try {
            JobSyncStatus currentStatus = jobSyncService.getSyncStatus(user.getId());
            emitter.send(SseEmitter.event().name("sync-status").data(currentStatus));
        } catch (Exception e) {
            // ignore — client will receive future events
        }
        return emitter;
    }

    /**
     * Purge jobs for the authenticated user only.
     */
    @DeleteMapping
    public ResponseEntity<Void> purgeJobs(@AuthenticationPrincipal User user) {
        jobService.purgeJobsForUser(user.getId());
        return ResponseEntity.noContent().build();
    }
}
