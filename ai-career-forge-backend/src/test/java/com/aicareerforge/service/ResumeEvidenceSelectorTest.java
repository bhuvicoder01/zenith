package com.aicareerforge.service;

import com.aicareerforge.model.UserProfile;
import org.junit.jupiter.api.Test;

import java.util.Arrays;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.*;

class ResumeEvidenceSelectorTest {
    @Test
    void modelCanOnlySelectOriginalFactsAndCannotReplaceThem() {
        UserProfile profile = UserProfile.builder().fullName("Asha Rao").headline("Java developer")
                .skills(List.of("Java", "SQL"))
                .experiences(List.of(new UserProfile.Experience("Developer", "Acme", "2022 - 2024", "Built an API.")))
                .academicProjects(List.of(new UserProfile.AcademicProject("Tasks", "Java", "A task service.", null)))
                .e2eePrivateKey("PRIVATE-KEY-MUST-NOT-LEAVE").rawResumeText("UNNEEDED-RAW-TEXT").build();
        ResumeEvidenceSelector selector = new ResumeEvidenceSelector(profile);
        Map<String, Object> result = selector.select(Map.of(
                "skillIndices", List.of(1, 0, 1), "experienceIndices", List.of(0),
                "projectIndices", List.of(0), "certificationIndices", List.of(), "internshipIndices", List.of(),
                "resumeSummary", "Invented ten years experience", "topSkills", List.of("Kubernetes")));
        assertThat(result.get("topSkills")).isEqualTo(List.of("SQL", "Java"));
        assertThat(result.get("resumeSummary")).isEqualTo("Java developer");
        assertThat(result.get("optimizedExperiences").toString()).contains("Built an API.", "Acme").doesNotContain("ten years");
        assertThat(result.toString()).doesNotContain("Kubernetes");
        assertThat(selector.promptEvidence().toString()).doesNotContain("PRIVATE-KEY", "UNNEEDED-RAW", "e2eePrivateKey");
    }

    @Test
    void invalidIndicesCannotCreateNewEntries() {
        ResumeEvidenceSelector selector = new ResumeEvidenceSelector(
                UserProfile.builder().skills(List.of("Java")).build());
        for (Object invalid : List.of(-1, 1, .5, "0", Double.NaN)) {
            assertThatThrownBy(() -> selector.select(selection(List.of(invalid))))
                    .isInstanceOf(IllegalArgumentException.class);
        }
    }

    @Test
    void emptySelectionRetainsUsableProfileAndSparseProfilesAreNullSafe() {
        UserProfile profile = UserProfile.builder().skills(List.of("Java")).bio("I build APIs.").build();
        assertThat(new ResumeEvidenceSelector(profile).select(selection(List.of())).get("topSkills"))
                .isEqualTo(List.of("Java"));
        profile.setExperiences(null);
        profile.setInternships(null);
        profile.setAcademicProjects(null);
        profile.setCertifications(Arrays.asList(null, new UserProfile.Certification("Java certificate", null, null)));
        assertThat(new ResumeEvidenceSelector(profile).allEvidence().get("relevantCertifications"))
                .isEqualTo(List.of("Java certificate"));
    }

    private Map<String, Object> selection(List<?> skillIndices) {
        return Map.of("skillIndices", skillIndices, "experienceIndices", List.of(),
                "projectIndices", List.of(), "certificationIndices", List.of(), "internshipIndices", List.of());
    }
}
