package com.aicareerforge.service;

import com.aicareerforge.model.UserProfile;
import com.aicareerforge.repository.UserProfileRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.stereotype.Service;

import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class JobSyncAgent {

    private final ChatClient chatClient;
    private final UserProfileRepository userProfileRepository;

    /**
     * Inspects active user profiles and dynamically returns a list of highly optimized keyword targets.
     */
    public List<String> generateDynamicKeywords() {
        log.info("JobSyncAgent generating dynamic keywords from active user profiles...");
        try {
            List<UserProfile> profiles = userProfileRepository.findAll();
            if (profiles.isEmpty()) {
                log.info("No user profiles found. Defaulting to baseline tech keywords.");
                return List.of("Software Engineer", "Frontend Developer", "Backend Developer", "AI Engineer");
            }

            // Extract skills/roles from all profiles
            String profilesSummary = profiles.stream()
                    .map(p -> String.format("Title: %s, Skills: %s", 
                            p.getHeadline() != null ? p.getHeadline() : "Developer",
                            p.getSkills() != null ? String.join(", ", p.getSkills()) : ""))
                    .limit(15) // Limit context size
                    .collect(Collectors.joining("\n"));

            String prompt = String.format("""
                    SYSTEM: You are a recruiting research agent. Given the list of candidate profiles below, extract the 8 most relevant job search query terms (e.g. "React Developer", "Data Scientist", "Go Engineer") that should be searched in job search APIs to find fitting vacancies for these candidates.
                    Provide ONLY a comma-separated list of the 8 queries. No explanations, no numbering.
                    
                    Candidate Profiles:
                    %s
                    """, profilesSummary);

            String result = chatClient.prompt().user(prompt).call().content();
            if (result != null && !result.isBlank()) {
                List<String> keywords = Arrays.stream(result.split(","))
                        .map(String::trim)
                        .filter(s -> !s.isEmpty())
                        .collect(Collectors.toList());
                if (!keywords.isEmpty()) {
                    log.info("JobSyncAgent generated dynamic query keywords: {}", keywords);
                    return keywords;
                }
            }
        } catch (Exception e) {
            log.error("Failed to generate dynamic keywords in JobSyncAgent: {}", e.getMessage());
        }

        return List.of("Software Engineer", "Frontend Developer", "Backend Developer", "AI Engineer");
    }

    /**
     * Generate focused search terms for a single user's job sync run.
     */
    public List<String> generateDynamicKeywordsForUser(UserProfile profile) {
        try {
            String profileSummary = String.format("Title: %s, Skills: %s, Experience: %s", 
                    profile.getHeadline() != null ? profile.getHeadline() : "Developer",
                    profile.getSkills() != null ? String.join(", ", profile.getSkills()) : "",
                    profile.getRawResumeText() != null ? profile.getRawResumeText().substring(0, Math.min(profile.getRawResumeText().length(), 500)) : "");

            String prompt = String.format("""
                    SYSTEM: You are a career research agent. Given the candidate profile below, extract the 3 most relevant job search query terms (e.g. "React Developer", "Golang Engineer") that will help them find matching jobs.
                    Provide ONLY a comma-separated list of these 3 queries. No explanations, no numbering.
                    
                    Candidate Profile:
                    %s
                    """, profileSummary);

            String result = chatClient.prompt().user(prompt).call().content();
            if (result != null && !result.isBlank()) {
                return Arrays.stream(result.split(","))
                        .map(String::trim)
                        .filter(s -> !s.isEmpty())
                        .collect(Collectors.toList());
            }
        } catch (Exception e) {
            log.error("Failed to generate user query keywords in JobSyncAgent: {}", e.getMessage());
        }
        return List.of(profile.getHeadline() != null ? profile.getHeadline() : "Software Engineer");
    }
}
