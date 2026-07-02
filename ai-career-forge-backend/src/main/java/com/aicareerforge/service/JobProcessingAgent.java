package com.aicareerforge.service;

import com.aicareerforge.model.Job;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class JobProcessingAgent {

    private final ChatClient chatClient;
    private final ObjectMapper objectMapper;

    @lombok.Data
    public static class ExtractedJobDetails {
        private String experienceLevel;
        private String remotePolicy;
        private List<String> techTags;
    }

    /**
     * Uses LLM to extract structured tags (experience level, remote policy, key tech stacks) from the job details.
     */
    public void processAndStructureJob(Job job) {
        log.info("JobProcessingAgent structuring job: {} (ID: {})", job.getTitle(), job.getId());
        try {
            String content = String.format("""
                    Job Title: %s
                    Company: %s
                    Location: %s
                    Description: %s
                    """, 
                    job.getTitle(), 
                    job.getCompany(), 
                    job.getLocation(), 
                    job.getDescription().substring(0, Math.min(job.getDescription().length(), 1500)));

            String prompt = String.format("""
                    SYSTEM: You are an expert ATS parser and job classification agent. Analyze the job posting below and extract:
                    1. experienceLevel: Categorize ONLY as JUNIOR, MID, SENIOR, or LEAD (LEAD includes principal/architect).
                    2. remotePolicy: Categorize ONLY as REMOTE, HYBRID, or ONSITE.
                    3. techTags: Extract a list of up to 5 primary technologies/languages/frameworks used.
                    
                    Return ONLY a valid JSON object matching this schema:
                    {
                      "experienceLevel": "JUNIOR" | "MID" | "SENIOR" | "LEAD",
                      "remotePolicy": "REMOTE" | "HYBRID" | "ONSITE",
                      "techTags": ["tag1", "tag2"]
                    }
                    No other wrapping text, markdown formatting, or explanations.
                    
                    Job Details:
                    %s
                    """, content);

            String response = chatClient.prompt().user(prompt).call().content();
            if (response != null && !response.isBlank()) {
                // Remove potential markdown code blocks if the LLM outputted them
                String cleanJson = response.replaceAll("```json", "").replaceAll("```", "").trim();
                
                ExtractedJobDetails details = objectMapper.readValue(cleanJson, ExtractedJobDetails.class);
                if (details != null) {
                    if (details.getExperienceLevel() != null) {
                        job.setExperienceLevel(details.getExperienceLevel().toUpperCase());
                    }
                    if (details.getRemotePolicy() != null) {
                        job.setRemotePolicy(details.getRemotePolicy().toUpperCase());
                    } else {
                        // Heuristic fallback
                        if (job.getLocation() != null && job.getLocation().toLowerCase().contains("remote")) {
                            job.setRemotePolicy("REMOTE");
                        } else {
                            job.setRemotePolicy("ONSITE");
                        }
                    }
                    if (details.getTechTags() != null) {
                        job.setTechTags(details.getTechTags());
                    }
                    log.info("Successfully extracted tags for job: experienceLevel={}, remotePolicy={}, techTags={}", 
                            job.getExperienceLevel(), job.getRemotePolicy(), job.getTechTags());
                }
            }
        } catch (Exception e) {
            log.error("Failed to structure job details in JobProcessingAgent: {}", e.getMessage());
            // Safe fallbacks
            if (job.getRemotePolicy() == null) {
                if (job.getLocation() != null && job.getLocation().toLowerCase().contains("remote")) {
                    job.setRemotePolicy("REMOTE");
                } else {
                    job.setRemotePolicy("ONSITE");
                }
            }
            if (job.getExperienceLevel() == null) {
                job.setExperienceLevel("MID"); // default fallback
            }
            if (job.getTechTags() == null) {
                job.setTechTags(new ArrayList<>());
            }
        }
    }
}
