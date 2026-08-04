package com.aicareerforge.dto;

import com.aicareerforge.model.UserProfile;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PublicProfileDTO {
    private String userId;
    private String email;
    private String username;
    private String fullName;
    private String headline;
    private String bio;
    private String profilePhotoUrl;
    private String coverImageUrl;
    private List<String> skills;
    private List<UserProfile.Experience> experiences;
    private List<UserProfile.AcademicProject> academicProjects;
    private List<UserProfile.Certification> certifications;
    private List<UserProfile.Internship> internships;
    private java.time.Instant lastOnline;
    private String e2eePublicKey;

    private String portfolioTemplate;
    private String portfolioThemeColor;
    private String portfolioFontFamily;
    private String portfolioFontSize;
    private boolean portfolioShowPhoto;
    private boolean portfolioShowEmail;
    private boolean portfolioShowBio;
    private boolean portfolioShowExperience;
    private boolean portfolioShowProjects;
    private boolean portfolioShowCertifications;
    private boolean portfolioShowInternships;
    private List<String> portfolioSectionOrder;

    public static PublicProfileDTO fromEntity(UserProfile profile) {
        if (profile == null) return null;

        boolean anonymize = profile.getSettings() != null && profile.getSettings().isAnonymizeData();
        boolean showEmail = profile.getSettings() == null || profile.getSettings().isShowEmail();
        String resolvedEmail = (showEmail && !anonymize) ? profile.getEmail() : null;

        boolean showOnline = profile.getSettings() == null || profile.getSettings().isShowOnlineStatus();
        java.time.Instant resolvedLastOnline = (showOnline && !anonymize) ? profile.getLastOnline() : null;

        String template = (profile.getSettings() != null) ? profile.getSettings().getPortfolioTemplate() : "minimalist";
        String themeColor = (profile.getSettings() != null) ? profile.getSettings().getPortfolioThemeColor() : "blue";
        String fontFamily = (profile.getSettings() != null) ? profile.getSettings().getPortfolioFontFamily() : "sans";
        String fontSize = (profile.getSettings() != null) ? profile.getSettings().getPortfolioFontSize() : "medium";
        boolean showPortPhoto = (profile.getSettings() == null) || profile.getSettings().isPortfolioShowPhoto();
        boolean showPortEmail = (profile.getSettings() == null) || profile.getSettings().isPortfolioShowEmail();
        boolean showPortBio = (profile.getSettings() == null) || profile.getSettings().isPortfolioShowBio();
        boolean showPortExp = (profile.getSettings() == null) || profile.getSettings().isPortfolioShowExperience();
        boolean showPortProj = (profile.getSettings() == null) || profile.getSettings().isPortfolioShowProjects();
        boolean showPortCert = (profile.getSettings() == null) || profile.getSettings().isPortfolioShowCertifications();
        boolean showPortIntern = (profile.getSettings() == null) || profile.getSettings().isPortfolioShowInternships();
        List<String> sectionOrder = (profile.getSettings() != null && profile.getSettings().getPortfolioSectionOrder() != null)
                ? profile.getSettings().getPortfolioSectionOrder()
                : java.util.Arrays.asList("hero", "skills", "experience", "projects", "certifications", "internships", "contact");

        return PublicProfileDTO.builder()
                .userId(profile.getUserId())
                .email(resolvedEmail)
                .username(profile.getUsername())
                .fullName(anonymize ? "Anonymous User" : profile.getFullName())
                .profilePhotoUrl(anonymize ? null : profile.getProfilePhotoUrl())
                .headline(profile.getHeadline())
                .bio(profile.getBio())
                .coverImageUrl(profile.getCoverImageUrl())
                .skills(profile.getSkills())
                .experiences(profile.getExperiences())
                .academicProjects(profile.getAcademicProjects())
                .certifications(profile.getCertifications())
                .internships(profile.getInternships())
                .lastOnline(resolvedLastOnline)
                .e2eePublicKey(profile.getE2eePublicKey())
                .portfolioTemplate(template)
                .portfolioThemeColor(themeColor)
                .portfolioFontFamily(fontFamily)
                .portfolioFontSize(fontSize)
                .portfolioShowPhoto(showPortPhoto)
                .portfolioShowEmail(showPortEmail)
                .portfolioShowBio(showPortBio)
                .portfolioShowExperience(showPortExp)
                .portfolioShowProjects(showPortProj)
                .portfolioShowCertifications(showPortCert)
                .portfolioShowInternships(showPortIntern)
                .portfolioSectionOrder(sectionOrder)
                .build();
    }
}
