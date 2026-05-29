package com.aicareerforge.service;

import com.aicareerforge.model.UserProfile;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class ApplicationPrepAgent {

    private final ChatClient chatClient;
    private final ObjectMapper objectMapper;

    public Map<String, Object> tailorResume(UserProfile profile, String jobDescription) {
        log.info("Tailoring resume for job description with full profile context.");
        String userName = profile.getFullName() != null ? profile.getFullName() : "";
        String prompt = String.format("""
                SYSTEM: You are an ATS expert and professional resume tailor.
                CRITICAL: The user's name is exactly "%s". You MUST use this EXACT spelling in all generated content. Do NOT alter, correct, or rephrase any names from the profile.
                USER: Analyze the following user profile and job description.
                Filter and optimize the content to create a high-impact, ATS-optimized version.
                
                You MUST return the response in strict JSON format with the following keys:
                - "resumeSummary": A 3-4 sentence professional summary tailored to the JD.
                - "optimizedExperiences": List of objects with { "title", "company", "duration", "description" } where description is tailored (Action Verb + Goal + Result).
                - "relevantProjects": List of objects with { "title", "technologies", "description" } from the profile that add value.
                - "relevantCertifications": List of strings (names) from the profile beneficial for this role.
                - "relevantInternships": List of objects with { "role", "company", "duration", "description" } that are relevant.
                - "topSkills": A list of the most important technical and soft skills for this role found in the profile or JD.
                
                Do not include any markdown formatting around the JSON.
                
                JD: %s
                PROFILE DATA: %s
                """, userName, jobDescription, profile.toString());

        try {
            String response = chatClient.prompt().user(prompt).call().content();
            String jsonRaw = response.replace("```json", "").replace("```", "").trim();
            return objectMapper.readValue(jsonRaw, new TypeReference<Map<String, Object>>() {});
        } catch (Exception e) {
            log.error("Failed to tailor resume: {}", e.getMessage());
            // Fallback to basic profile mapping
            return Map.of(
                "resumeSummary", "Professional profile optimized for the role.",
                "optimizedExperiences", profile.getExperiences(),
                "relevantProjects", profile.getAcademicProjects() != null ? profile.getAcademicProjects() : List.of(),
                "relevantCertifications", profile.getCertifications() != null ? profile.getCertifications() : List.of(),
                "relevantInternships", profile.getInternships() != null ? profile.getInternships() : List.of(),
                "topSkills", profile.getSkills()
            );
        }
    }

    public Map<String, String> generateCommunicationKit(String resumeText, String jobDescription) {
        log.info("Generating consolidated communication kit (Cover Letter + Email Intro)");
        String prompt = String.format("""
                SYSTEM: You are a professional career coach and networking expert.
                CRITICAL: Any person's name found in the resume MUST be used with its EXACT original spelling. Do NOT alter, correct, or rephrase any names.
                USER: Based on the resume and job description, generate two items:
                1. A compelling, personalized cover letter.
                2. A concise email introduction for a hiring manager.
                
                You MUST return the response in strict JSON format with exactly two keys: "coverLetter" and "emailIntro".
                Do not include any preamble or markdown formatting around the JSON.
                
                JD: %s
                RESUME: %s
                """, jobDescription, resumeText);
        
        try {
            String response = chatClient.prompt().user(prompt).call().content();
            // Basic cleanup in case of markdown blocks
            String jsonRaw = response.replace("```json", "").replace("```", "").trim();
            return objectMapper.readValue(jsonRaw, new TypeReference<Map<String, String>>() {});
        } catch (Exception e) {
            log.error("Failed to generate communication kit: {}", e.getMessage());
            return Map.of(
                "coverLetter", "Professional cover letter draft - AI quota limit reached, please retry later.",
                "emailIntro", "Networking email draft - AI quota limit reached."
            );
        }
    }

    public String generateInterviewPrepKit(String jobDescription, String company, String resumeText) {
        String prompt = String.format("""
                SYSTEM: You are an expert interviewer.
                CRITICAL: Any person's name found in the resume MUST be used with its EXACT original spelling. Do NOT alter, correct, or rephrase any names.
                USER: Generate a full interview prep kit.
                Include:
                1. Technical Q&A (10 detailed pairs).
                2. Behavioral (5 STAR-method scripts).
                3. 'Tell Me About Yourself' elevator pitch.
                4. Aptitude & Logic (3 questions).
                5. Culture Fit (3 company-specific questions).
                
                JD: %s
                COMPANY: %s
                RESUME: %s
                """, jobDescription, company, resumeText);
        return chatClient.prompt().user(prompt).call().content();
    }
}
