package com.aicareerforge.service;

import com.aicareerforge.model.Job;
import com.aicareerforge.model.UserActivity;
import com.aicareerforge.model.UserProfile;
import com.aicareerforge.repository.JobRepository;
import com.aicareerforge.repository.UserActivityRepository;
import lombok.Builder;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class PersonalizedJobService {

    private final JobService jobService;
    private final JobRepository jobRepository;
    private final UserActivityRepository activityRepository;

    @Data
    @Builder
    @lombok.NoArgsConstructor
    @lombok.AllArgsConstructor
    public static class JobDashboardResponse {
        private List<Job> topPicks;
        private List<Job> likelyToHearBack;
        private List<Job> basedOnActivity;
        private List<Job> remoteJobs;
        private List<Job> easyApply;
    }

    @org.springframework.cache.annotation.Cacheable(value = "jobDashboard", key = "#profile.userId", unless = "#result == null")
    public JobDashboardResponse getPersonalizedDashboard(UserProfile profile) {
        String userId = profile.getUserId();
        
        // 1. Top Picks (High match score based on vector search)
        List<Job> topPicks = jobService.getRecommendedJobs(profile).stream()
                .limit(10)
                .collect(Collectors.toList());

        // 2. Likely to hear back (High score + Low applicant count simulated or recently posted)
        List<Job> likelyToHearBack = topPicks.stream()
                .filter(job -> job.getMatchScore() != null && job.getMatchScore() > 85)
                .limit(5)
                .collect(Collectors.toList());

        // 3. Based on activity (Similar to applied/saved jobs)
        List<Job> basedOnActivity = getJobsBasedOnActivity(userId, profile);

        // 4. Remote Jobs
        List<Job> remoteJobs = jobRepository.findTop50ByUserIdIsNullOrderByPostedDateDesc().stream()
                .filter(j -> j.getLocation() != null && j.getLocation().toLowerCase().contains("remote"))
                .limit(10)
                .collect(Collectors.toList());

        // 5. Easy Apply (Simulated as local jobs or specific sources)
        List<Job> easyApply = jobRepository.findTop50ByUserIdIsNullOrderByPostedDateDesc().stream()
                .filter(j -> "remotive".equals(j.getSource()) || "local".equals(j.getSource()))
                .limit(10)
                .collect(Collectors.toList());

        return JobDashboardResponse.builder()
                .topPicks(topPicks)
                .likelyToHearBack(likelyToHearBack)
                .basedOnActivity(basedOnActivity)
                .remoteJobs(remoteJobs)
                .easyApply(easyApply)
                .build();
    }

    private List<Job> getJobsBasedOnActivity(String userId, UserProfile profile) {
        List<UserActivity> recentActivities = activityRepository.findByUserId(userId);
        if (recentActivities.isEmpty()) return Collections.emptyList();

        // Get keywords from recent searches
        List<String> searchKeywords = recentActivities.stream()
                .filter(a -> a.getType() == UserActivity.ActivityType.SEARCH)
                .map(UserActivity::getSearchQuery)
                .filter(q -> q != null && q.length() > 3)
                .limit(5)
                .collect(Collectors.toList());

        if (searchKeywords.isEmpty()) {
             // Fallback to applied jobs titles
             searchKeywords = recentActivities.stream()
                .filter(a -> a.getType() == UserActivity.ActivityType.APPLY)
                .map(a -> jobService.getJobById(a.getJobId()))
                .filter(j -> j != null)
                .map(Job::getTitle)
                .limit(3)
                .collect(Collectors.toList());
        }

        if (searchKeywords.isEmpty()) return Collections.emptyList();

        // Simple keyword-based search in local repository for "activity" recommendations
        List<Job> activityJobs = new ArrayList<>();
        for (String keyword : searchKeywords) {
            activityJobs.addAll(jobRepository.findFallbackJobs(keyword));
            if (activityJobs.size() > 20) break;
        }

        return activityJobs.stream()
                .distinct()
                .map(job -> {
                    job.setMatchScore(jobService.calculateMatchScore(job, profile, 0.6));
                    return job;
                })
                .sorted((a, b) -> {
                    double s1 = a.getMatchScore() != null ? a.getMatchScore() : 0.0;
                    double s2 = b.getMatchScore() != null ? b.getMatchScore() : 0.0;
                    return Double.compare(s2, s1);
                })
                .limit(10)
                .collect(Collectors.toList());
    }

    @org.springframework.cache.annotation.CacheEvict(value = "jobDashboard", key = "#userId")
    public void trackActivity(String userId, UserActivity.ActivityType type, String jobId, String searchQuery) {
        UserActivity activity = UserActivity.builder()
                .userId(userId)
                .type(type)
                .jobId(jobId)
                .searchQuery(searchQuery)
                .timestamp(java.time.LocalDateTime.now())
                .build();
        activityRepository.save(activity);

        // Automatically add to corresponding Kanban stages when applying or saving
        if (jobId != null) {
            if (type == UserActivity.ActivityType.APPLY) {
                jobService.updateJobPipelineStage(userId, jobId, "APPLIED");
            } else if (type == UserActivity.ActivityType.SAVE) {
                jobService.updateJobPipelineStage(userId, jobId, "SAVED");
            }
        }
    }
}
