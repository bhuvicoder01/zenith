package com.aicareerforge.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "user_profiles")
public class UserProfile {

    @Id
    private String id;

    private String userId; // Link to User
    private String email; // Transient/Stored for UI
    private boolean isPasswordGenerated; // For security UI
    
    @org.springframework.data.mongodb.core.index.Indexed(unique = true, sparse = true)
    private String username;
    
    @org.springframework.data.annotation.Transient
    private String previousUsername;

    @org.springframework.data.annotation.Transient
    private java.time.Instant previousUsernameReservedUntil;

    private String fullName;
    private String headline;
    private String bio;
    private String profilePhotoUrl;
    private String coverImageUrl;

    private String resumeS3Url;
    private String parsedGoals;
    private String rawResumeText;
    
    @Builder.Default
    private List<String> skills = new java.util.ArrayList<>();
    @Builder.Default
    private List<Experience> experiences = new java.util.ArrayList<>();

    private String preferredLocation;
    private String preferredSalary;
    private String preferredLifestyle;

    @Builder.Default
    private List<AcademicProject> academicProjects = new java.util.ArrayList<>();
    @Builder.Default
    private List<Certification> certifications = new java.util.ArrayList<>();
    @Builder.Default
    private List<Internship> internships = new java.util.ArrayList<>();

    private java.time.Instant lastOnline;

    @Builder.Default
    private UserSettings settings = new UserSettings();

    private String e2eePublicKey;
    private String e2eePrivateKey;

    @Builder.Default
    private java.util.Map<String, Double> matchWeights = new java.util.HashMap<>();

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UserSettings {
        private int matchingPrecision = 80;
        private boolean aggressiveEnrichment = true;
        private boolean emailNotifications = true;
        private boolean jobMatchAlerts = true;
        private boolean hideProfile = false;
        private boolean anonymizeData = false;
        private boolean showEmail = true;
        private boolean showOnlineStatus = true;
        private boolean deviceNotifications = true;

        private String portfolioTemplate = "minimalist";
        private String portfolioThemeColor = "blue";
        private String portfolioFontFamily = "sans";
        private String portfolioFontSize = "medium";
        private boolean portfolioShowPhoto = true;
        private boolean portfolioShowEmail = true;
        private boolean portfolioShowBio = true;
        private boolean portfolioShowExperience = true;
        private boolean portfolioShowProjects = true;
        private boolean portfolioShowCertifications = true;
        private boolean portfolioShowInternships = true;

        @Builder.Default
        private List<String> portfolioSectionOrder = java.util.Arrays.asList(
            "hero", "skills", "experience", "projects", "certifications", "internships", "contact"
        );
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Experience {
        private String title;
        private String company;
        private String duration;
        private String description;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AcademicProject {
        private String title;
        private String technologies;
        private String description;
        private String link;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Certification {
        private String name;
        private String issuingOrganization;
        private String issueDate;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Internship {
        private String role;
        private String company;
        private String duration;
        private String description;
    }
}
