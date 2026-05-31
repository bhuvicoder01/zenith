package com.aicareerforge.service;

import com.aicareerforge.model.Application;
import com.aicareerforge.model.User;
import com.aicareerforge.model.UserProfile;
import com.aicareerforge.repository.ApplicationRepository;
import com.aicareerforge.repository.UserProfileRepository;
import com.aicareerforge.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import com.aicareerforge.security.WebSocketAppHandler;

@Slf4j
@Service
@RequiredArgsConstructor
public class ApplicationTrackerService {

    private final ApplicationRepository applicationRepository;
    private final UserRepository userRepository;
    private final UserProfileRepository userProfileRepository;
    private final ApplicationPrepAgent prepAgent;
    private final PdfGenerationService pdfGenerationService;
    private final S3Service s3Service;
    private final WebSocketAppHandler webSocketAppHandler;

    public List<Application> getUserApplications(String userId) {
        List<Application> apps = applicationRepository.findByUserId(userId);
        apps.forEach(this::hydrateUrls);
        return apps;
    }

    public Application getApplication(String id, String userId) {
        Application app = applicationRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Application not found with id: " + id));
        if (!app.getUserId().equals(userId)) {
            throw new RuntimeException("Unauthorized to access this application");
        }
        hydrateUrls(app);
        return app;
    }

    private void hydrateUrls(Application app) {
        if (app == null) return;
        app.setTailoredResumeS3Url(hydrateUrl(app.getTailoredResumeS3Url()));
    }

    private String hydrateUrl(String url) {
        if (url == null || url.isBlank() || url.contains("preparing")) return url;
        if (url.startsWith("http")) {
            if (url.contains("pollinations.ai") || url.contains("unsplash.com")) {
                return s3Service.getProxyUrl(url);
            }
            return url;
        }
        return s3Service.getPermanentUrl(url);
    }

    public Application createApplication(String userId, Application req) {
        if (req.getJobId() != null && req.getTemplateStyle() != null) {
            java.util.Optional<Application> existing = applicationRepository
                    .findFirstByUserIdAndJobIdAndTemplateStyle(userId, req.getJobId(), req.getTemplateStyle());
            if (existing.isPresent()) {
                log.info("Application already exists for user: {}, job: {}, style: {}. Re-using application: {}", 
                    userId, req.getJobId(), req.getTemplateStyle(), existing.get().getId());
                return existing.get();
            }
        }
        req.setUserId(userId);
        req.setStatus(Application.Status.SAVED);
        req.setAppliedDate(LocalDateTime.now());
        return applicationRepository.save(req);
    }

    public Application prepareApplicationMaterials(String applicationId, String resumeText, String jobDescription, String company) {
        Application app = applicationRepository.findById(applicationId)
                .orElseThrow(() -> new RuntimeException("Application not found for preparation: " + applicationId));
        
        if (app.getTailoredResumeS3Url() != null && app.getCoverLetterText() != null && app.getInterviewPrepText() != null) {
            log.info("Application materials already prepared for application: {}. Skipping re-generation.", applicationId);
            webSocketAppHandler.sendNotification(app.getUserId(), "PREP_STATUS", "Preparation Completed", "Application materials retrieved successfully!", Map.of("step", "COMPLETED", "status", "success"));
            return app;
        }

        log.info("Preparing materials for application: {} (Company: {})", applicationId, company);
        
        try {
            // Send initial progress update
            webSocketAppHandler.sendNotification(app.getUserId(), "PREP_STATUS", "Preparation Started", "Retrieving user details...", Map.of("step", "STARTING", "status", "processing"));

            // 0. Fetch User and Profile Data
            User user = userRepository.findById(app.getUserId())
                    .orElseThrow(() -> new RuntimeException("User not found for application: " + app.getUserId()));
            UserProfile profile = userProfileRepository.findByUserId(app.getUserId())
                    .orElseThrow(() -> new RuntimeException("UserProfile not found for user: " + app.getUserId()));

            // Send progress update: AI generation starting
            webSocketAppHandler.sendNotification(app.getUserId(), "PREP_STATUS", "AI Generation", "Running AI agents in parallel...", Map.of("step", "AI_GENERATION", "status", "processing"));

            // 1. Kick off AI calls in parallel using CompletableFuture
            CompletableFuture<Map<String, Object>> tailoredDataFuture = CompletableFuture.supplyAsync(() -> 
                prepAgent.tailorResume(profile, jobDescription)
            );
            
            CompletableFuture<Map<String, String>> commKitFuture = CompletableFuture.supplyAsync(() -> 
                prepAgent.generateCommunicationKit(profile.getRawResumeText(), jobDescription)
            );
            
            CompletableFuture<String> prepKitFuture = CompletableFuture.supplyAsync(() -> 
                prepAgent.generateInterviewPrepKit(jobDescription, company, profile.getRawResumeText())
            );

            // Wait for all three AI tasks to complete concurrently
            CompletableFuture.allOf(tailoredDataFuture, commKitFuture, prepKitFuture).join();

            // 2. Extract results
            Map<String, Object> tailoredData = tailoredDataFuture.get();
            Map<String, String> commKit = commKitFuture.get();
            String prepKit = prepKitFuture.get();

            app.setCoverLetterText(getCaseInsensitiveValue(commKit, "coverLetter", "cover_letter", "coverletter"));
            app.setEmailIntroduction(getCaseInsensitiveValue(commKit, "emailIntro", "email_intro", "emailintro"));
            app.setInterviewPrepText(prepKit);

            // Send progress update: PDF rendering starting
            webSocketAppHandler.sendNotification(app.getUserId(), "PREP_STATUS", "PDF Rendering", "Generating custom PDF resume...", Map.of("step", "PDF_RENDERING", "status", "processing"));

            // 3. PDF Rendering with Real Data
            String template = "MODERN".equalsIgnoreCase(app.getTemplateStyle()) ? "resume-modern" : "resume-classic";
            Map<String, Object> pdfParams = new java.util.HashMap<>();
            pdfParams.put("name", user.getName());
            pdfParams.put("email", user.getEmail());
            pdfParams.put("summary", getCaseInsensitiveObject(tailoredData, "resumeSummary", "resumesummary", "resume_summary"));
            pdfParams.put("experiences", getCaseInsensitiveObject(tailoredData, "optimizedExperiences", "optimizedexperiences", "optimized_experiences", "experiences"));
            pdfParams.put("projects", getCaseInsensitiveObject(tailoredData, "relevantProjects", "relevantprojects", "relevant_projects", "projects"));
            pdfParams.put("certifications", getCaseInsensitiveObject(tailoredData, "relevantCertifications", "relevantcertifications", "relevant_certifications", "certifications"));
            pdfParams.put("internships", getCaseInsensitiveObject(tailoredData, "relevantInternships", "relevantinternships", "relevant_internships", "internships"));
            pdfParams.put("skills", getCaseInsensitiveObject(tailoredData, "topSkills", "topskills", "top_skills", "skills"));
            
            byte[] pdfBytes = pdfGenerationService.generatePdf(template, pdfParams);
            
            String s3Key = s3Service.uploadFile(pdfBytes, "tailored_resume.pdf", app.getUserId());
            app.setTailoredResumeS3Url(s3Key); // Store only the key
            
            app.setStatus(Application.Status.APPLIED);
            log.info("Materials successfully prepared for application: {}", applicationId);

            // Send final success notification
            webSocketAppHandler.sendNotification(app.getUserId(), "PREP_STATUS", "Preparation Completed", "Application materials generated successfully!", Map.of("step", "COMPLETED", "status", "success"));

        } catch (Exception e) {
            log.error("Partial failure in materials preparation: {}", e.getMessage());
            app.setStatus(Application.Status.SAVED); // Rollback to saved status for retry
            webSocketAppHandler.sendNotification(app.getUserId(), "PREP_STATUS", "Preparation Failed", "An error occurred during preparation: " + e.getMessage(), Map.of("step", "FAILED", "status", "failed", "error", e.getMessage()));
        }
        
        Application saved = applicationRepository.save(app);
        hydrateUrls(saved);
        return saved;
    }

    public Application updateStatus(String applicationId, Application.Status status, String userId) {
        Application app = applicationRepository.findById(applicationId)
                .orElseThrow(() -> new RuntimeException("Application not found for status update: " + applicationId));
        if (!app.getUserId().equals(userId)) {
            throw new RuntimeException("Unauthorized to update this application");
        }
        app.setStatus(status);
        return applicationRepository.save(app);
    }

    public void deleteApplication(String applicationId, String userId) {
        Application app = applicationRepository.findById(applicationId)
                .orElseThrow(() -> new RuntimeException("Application not found for deletion: " + applicationId));
        if (!app.getUserId().equals(userId)) {
            throw new RuntimeException("Unauthorized to delete this application");
        }
        applicationRepository.delete(app);
    }

    private String getCaseInsensitiveValue(Map<String, String> map, String... keys) {
        if (map == null) return null;
        for (String key : keys) {
            if (map.containsKey(key)) {
                return map.get(key);
            }
        }
        for (String key : keys) {
            String cleanSearch = key.toLowerCase().replace("_", "").replace("-", "");
            for (Map.Entry<String, String> entry : map.entrySet()) {
                String cleanEntry = entry.getKey().toLowerCase().replace("_", "").replace("-", "");
                if (cleanEntry.equals(cleanSearch)) {
                    return entry.getValue();
                }
            }
        }
        return null;
    }

    private Object getCaseInsensitiveObject(Map<String, Object> map, String... keys) {
        if (map == null) return null;
        for (String key : keys) {
            if (map.containsKey(key)) {
                return map.get(key);
            }
        }
        for (String key : keys) {
            String cleanSearch = key.toLowerCase().replace("_", "").replace("-", "");
            for (Map.Entry<String, Object> entry : map.entrySet()) {
                String cleanEntry = entry.getKey().toLowerCase().replace("_", "").replace("-", "");
                if (cleanEntry.equals(cleanSearch)) {
                    return entry.getValue();
                }
            }
        }
        return null;
    }
}
