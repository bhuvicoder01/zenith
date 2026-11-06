package com.aicareerforge.service;

import com.aicareerforge.model.UserProfile;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;

/**
 * The model may select and order evidence, but never author candidate facts.
 * Resume output is reconstructed from the stored profile after index validation.
 */
final class ResumeEvidenceSelector {
    private final UserProfile profile;
    private final List<String> skills;
    private final List<Map<String, String>> experiences;
    private final List<Map<String, String>> projects;
    private final List<String> certifications;
    private final List<Map<String, String>> internships;

    ResumeEvidenceSelector(UserProfile profile) {
        this.profile = Objects.requireNonNull(profile, "A profile is required");
        skills = entries(profile.getSkills()).stream().filter(s -> !s.isBlank()).distinct().toList();
        experiences = entries(profile.getExperiences()).stream().map(e -> Map.of(
                "title", text(e.getTitle()), "company", text(e.getCompany()),
                "duration", text(e.getDuration()), "description", text(e.getDescription()))).toList();
        projects = entries(profile.getAcademicProjects()).stream().map(p -> Map.of(
                "title", text(p.getTitle()), "technologies", text(p.getTechnologies()),
                "description", text(p.getDescription()), "link", text(p.getLink()))).toList();
        certifications = entries(profile.getCertifications()).stream()
                .map(UserProfile.Certification::getName).filter(Objects::nonNull)
                .filter(name -> !name.isBlank()).toList();
        internships = entries(profile.getInternships()).stream().map(i -> Map.of(
                "role", text(i.getRole()), "company", text(i.getCompany()),
                "duration", text(i.getDuration()), "description", text(i.getDescription()))).toList();
    }

    Map<String, Object> promptEvidence() {
        // Do not serialize the complete UserProfile: it also holds account settings and key material.
        Map<String, Object> evidence = new LinkedHashMap<>();
        evidence.put("fullName", text(profile.getFullName()));
        evidence.put("headline", text(profile.getHeadline()));
        evidence.put("skills", skills);
        evidence.put("experiences", experiences);
        evidence.put("projects", projects);
        evidence.put("certifications", certifications);
        evidence.put("internships", internships);
        return evidence;
    }

    Map<String, Object> select(Map<String, Object> selection) {
        Objects.requireNonNull(selection, "A selection is required");
        List<String> chosenSkills = selected(skills, selection.get("skillIndices"));
        List<Map<String, String>> chosenExperiences = selected(experiences, selection.get("experienceIndices"));
        List<Map<String, String>> chosenProjects = selected(projects, selection.get("projectIndices"));
        List<String> chosenCertifications = selected(certifications, selection.get("certificationIndices"));
        List<Map<String, String>> chosenInternships = selected(internships, selection.get("internshipIndices"));
        if (chosenSkills.isEmpty() && chosenExperiences.isEmpty() && chosenProjects.isEmpty()
                && chosenCertifications.isEmpty() && chosenInternships.isEmpty()) {
            return allEvidence();
        }
        return result(chosenSkills, chosenExperiences, chosenProjects, chosenCertifications, chosenInternships);
    }

    Map<String, Object> allEvidence() {
        return result(skills, experiences, projects, certifications, internships);
    }

    private Map<String, Object> result(List<String> selectedSkills,
                                      List<Map<String, String>> selectedExperiences,
                                      List<Map<String, String>> selectedProjects,
                                      List<String> selectedCertifications,
                                      List<Map<String, String>> selectedInternships) {
        String summary = text(profile.getBio());
        if (summary.isBlank()) summary = text(profile.getHeadline());
        if (summary.isBlank() && !selectedSkills.isEmpty()) {
            summary = "Skills: " + String.join(", ", selectedSkills) + ".";
        }
        return Map.of(
                "resumeSummary", summary,
                "optimizedExperiences", selectedExperiences,
                "relevantProjects", selectedProjects,
                "relevantCertifications", selectedCertifications,
                "relevantInternships", selectedInternships,
                "topSkills", selectedSkills);
    }

    private static <T> List<T> selected(List<T> source, Object rawIndices) {
        if (!(rawIndices instanceof List<?> indices)) {
            throw new IllegalArgumentException("Expected a list of evidence indices");
        }
        LinkedHashSet<Integer> uniqueIndices = new LinkedHashSet<>();
        for (Object rawIndex : indices) {
            if (!(rawIndex instanceof Number number)
                    || !Double.isFinite(number.doubleValue())
                    || number.doubleValue() != Math.rint(number.doubleValue())
                    || number.doubleValue() < 0
                    || number.doubleValue() >= source.size()) {
                throw new IllegalArgumentException("Invalid evidence index");
            }
            uniqueIndices.add(number.intValue());
        }
        List<T> result = new ArrayList<>();
        uniqueIndices.forEach(index -> result.add(source.get(index)));
        return result;
    }

    private static <T> List<T> entries(List<T> values) {
        return values == null ? List.of() : values.stream().filter(Objects::nonNull).toList();
    }

    private static String text(String value) {
        return value == null ? "" : value;
    }
}
