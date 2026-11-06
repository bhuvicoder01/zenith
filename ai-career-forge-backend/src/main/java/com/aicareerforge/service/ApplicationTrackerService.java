package com.aicareerforge.service;

import com.aicareerforge.model.Application;
import com.aicareerforge.model.User;
import com.aicareerforge.model.UserProfile;
import com.aicareerforge.model.Job;
import com.aicareerforge.repository.ApplicationRepository;
import com.aicareerforge.repository.UserProfileRepository;
import com.aicareerforge.repository.UserRepository;
import com.aicareerforge.repository.JobRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.FindAndModifyOptions;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

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
    private final JobRepository jobRepository;
    private final MongoTemplate mongoTemplate;

    public List<Application> getUserApplications(String userId) {
        List<Application> apps = applicationRepository.findByUserId(userId);
        apps.forEach(this::hydrateUrls);
        return apps;
    }

    public Application getApplication(String id, String userId) {
        Application app = findOwnedApplication(id, userId);
        hydrateUrls(app);
        return app;
    }

    private void hydrateUrls(Application app) {
        if (app == null) return;
        String url = app.getTailoredResumeS3Url();
        if (url != null && !url.isBlank() && !"preparing".equals(url)) {
            app.setTailoredResumeS3Url(s3Service.getPrivateAssetUrl(url, app.getUserId()));
        }
    }

    public Application createApplication(String userId, Application req) {
        if (req.getJobId() != null && req.getTemplateStyle() != null) {
            java.util.Optional<Application> existing = applicationRepository
                    .findFirstByUserIdAndJobIdAndTemplateStyle(userId, req.getJobId(), req.getTemplateStyle());
            if (existing.isPresent()) {
                log.info("Application already exists for user: {}, job: {}, style: {}. Re-using application: {}", 
                    userId, req.getJobId(), req.getTemplateStyle(), existing.get().getId());
                Application app = existing.get();
                hydrateUrls(app);
                return app;
            }
        }
        // POST creates a new owned record; a supplied ID must never overwrite another application.
        req.setId(null);
        req.setUserId(userId);
        req.setStatus(Application.Status.SAVED);
        req.setAppliedDate(null);
        req.setTailoredResumeS3Url(null);
        req.setCoverLetterText(null);
        req.setEmailIntroduction(null);
        req.setInterviewPrepText(null);
        return applicationRepository.save(req);
    }

    public Application prepareApplicationMaterials(String applicationId, String userId, String jobDescription, String company) {
        // Validate ownership before reading any resume data or calling paid providers.
        Application app = findOwnedApplication(applicationId, userId);

        if ((jobDescription == null || jobDescription.isBlank()) && app.getJobId() != null) {
            Job job = jobRepository.findById(app.getJobId()).orElse(null);
            if (job != null) {
                jobDescription = job.getDescription();
                if (company == null || company.isBlank()) {
                    company = job.getCompany();
                }
            }
        }

        if (company == null || company.isBlank()) {
            company = app.getCompany() != null ? app.getCompany() : "Target Company";
        }

        if (jobDescription == null || jobDescription.isBlank()) {
            jobDescription = "Position at " + company + ". Requirements: " + app.getJobTitle();
        }
        
        if (app.getTailoredResumeS3Url() != null 
                && !app.getTailoredResumeS3Url().equals("preparing") 
                && app.getCoverLetterText() != null 
                && app.getEmailIntroduction() != null
                && app.getInterviewPrepText() != null) {
            log.info("Application materials already prepared for application: {}. Skipping re-generation.", applicationId);
            webSocketAppHandler.sendNotification(app.getUserId(), "PREP_STATUS", "Preparation Completed", "Application materials retrieved successfully!", Map.of("step", "COMPLETED", "status", "success", "applicationId", applicationId));
            hydrateUrls(app);
            return app;
        }

        log.info("Preparing materials for application: {} (Company: {})", applicationId, company);
        
        // Mark as preparing in DB so refresh/list reflects loading state
        app.setTailoredResumeS3Url("preparing");
        mongoTemplate.updateFirst(ownedQuery(applicationId, userId),
                new Update().set("tailoredResumeS3Url", "preparing"), Application.class);
        
        boolean prepared = false;
        try {
            // Send initial progress update
            webSocketAppHandler.sendNotification(app.getUserId(), "PREP_STATUS", "Preparation Started", "Retrieving user details...", Map.of("step", "STARTING", "status", "processing", "applicationId", applicationId));

            // 0. Fetch User and Profile Data
            User user = userRepository.findById(app.getUserId())
                    .orElseThrow(() -> new RuntimeException("User not found for application: " + app.getUserId()));
            UserProfile profile = userProfileRepository.findByUserId(app.getUserId())
                    .orElseThrow(() -> new RuntimeException("UserProfile not found for user: " + app.getUserId()));

            // Send progress update: AI generation starting
            webSocketAppHandler.sendNotification(app.getUserId(), "PREP_STATUS", "AI Generation", "Running AI agents in parallel...", Map.of("step", "AI_GENERATION", "status", "processing", "applicationId", applicationId));

            // 1. Kick off AI calls in parallel using CompletableFuture
            final String finalJobDescription = jobDescription;
            final String finalCompany = company;

            CompletableFuture<Map<String, Object>> tailoredDataFuture = CompletableFuture.supplyAsync(() -> 
                prepAgent.tailorResume(profile, finalJobDescription)
            );
            
            CompletableFuture<Map<String, String>> commKitFuture = CompletableFuture.supplyAsync(() -> 
                prepAgent.generateCommunicationKit(profile.getRawResumeText(), finalJobDescription)
            );
            
            CompletableFuture<String> prepKitFuture = CompletableFuture.supplyAsync(() -> 
                prepAgent.generateInterviewPrepKit(finalJobDescription, finalCompany, profile.getRawResumeText())
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
            webSocketAppHandler.sendNotification(app.getUserId(), "PREP_STATUS", "PDF Rendering", "Generating custom PDF resume...", Map.of("step", "PDF_RENDERING", "status", "processing", "applicationId", applicationId));

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
            
            // Document readiness does not mean the candidate submitted an application.
            log.info("Materials successfully prepared for application: {}", applicationId);

            prepared = true;

        } catch (Exception e) {
            log.warn("Materials preparation failed for application {} ({})",
                    applicationId, e.getClass().getSimpleName());
            app.setTailoredResumeS3Url(null);
        }
        
        // Update only generated fields: a concurrent user status change must not be overwritten.
        Update documents = new Update()
                .set("tailoredResumeS3Url", app.getTailoredResumeS3Url())
                .set("coverLetterText", app.getCoverLetterText())
                .set("emailIntroduction", app.getEmailIntroduction())
                .set("interviewPrepText", app.getInterviewPrepText());
        Application saved = mongoTemplate.findAndModify(ownedQuery(applicationId, userId), documents,
                FindAndModifyOptions.options().returnNew(true), Application.class);
        if (saved == null) throw notFound();
        hydrateUrls(saved);
        // Event-driven refreshes must see the persisted result, not the earlier "preparing" marker.
        if (prepared) {
            webSocketAppHandler.sendNotification(app.getUserId(), "PREP_STATUS", "Preparation Completed",
                    "Application materials generated successfully!",
                    Map.of("step", "COMPLETED", "status", "success", "applicationId", applicationId));
        } else {
            String message = "We could not prepare all documents. Your application status is unchanged. Please try again.";
            webSocketAppHandler.sendNotification(app.getUserId(), "PREP_STATUS", "Preparation Failed",
                    message, Map.of("step", "FAILED", "status", "failed", "error", message, "applicationId", applicationId));
        }
        return saved;
    }

    public Application updateStatus(String applicationId, Application.Status status, String userId) {
        if (status == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Application status is required");
        Application app = findOwnedApplication(applicationId, userId);
        Update update = new Update().set("status", status);
        if (status == Application.Status.APPLIED && app.getAppliedDate() == null) {
            update.set("appliedDate", LocalDateTime.now());
        } else if (status == Application.Status.SAVED) {
            update.set("appliedDate", null);
        }
        Application saved = mongoTemplate.findAndModify(ownedQuery(applicationId, userId), update,
                FindAndModifyOptions.options().returnNew(true), Application.class);
        if (saved == null) throw notFound();
        hydrateUrls(saved);
        return saved;
    }

    public void deleteApplication(String applicationId, String userId) {
        Application app = findOwnedApplication(applicationId, userId);
        applicationRepository.delete(app);
    }

    private Application findOwnedApplication(String id, String userId) {
        if (userId == null || userId.isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Sign in to access applications");
        }
        return applicationRepository.findById(id)
                .filter(app -> userId.equals(app.getUserId()))
                .orElseThrow(this::notFound);
    }

    private Query ownedQuery(String id, String userId) {
        return Query.query(Criteria.where("_id").is(id).and("userId").is(userId));
    }

    private ResponseStatusException notFound() {
        return new ResponseStatusException(HttpStatus.NOT_FOUND, "Application not found");
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
