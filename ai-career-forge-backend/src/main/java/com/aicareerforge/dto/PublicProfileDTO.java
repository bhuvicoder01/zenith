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

    public static PublicProfileDTO fromEntity(UserProfile profile) {
        if (profile == null) return null;

        boolean anonymize = profile.getSettings() != null && profile.getSettings().isAnonymizeData();
        boolean showEmail = profile.getSettings() == null || profile.getSettings().isShowEmail();
        String resolvedEmail = (showEmail && !anonymize) ? profile.getEmail() : null;

        boolean showOnline = profile.getSettings() == null || profile.getSettings().isShowOnlineStatus();
        java.time.Instant resolvedLastOnline = (showOnline && !anonymize) ? profile.getLastOnline() : null;

        return PublicProfileDTO.builder()
                .userId(profile.getUserId())
                .email(resolvedEmail)
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
                .build();
    }
}
