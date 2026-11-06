package com.aicareerforge.service;

import com.aicareerforge.model.Job;
import com.aicareerforge.model.UserProfile;
import org.junit.jupiter.api.Test;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.*;

class JobScoringServiceTest {
    private final JobScoringService scoring = new JobScoringService();

    @Test
    void noEvidenceProducesZeroRatherThanAnInflatedMinimum() {
        assertThat(scoring.calculateMatchScore(new Job(), new UserProfile(), null)).isZero();
        assertThat(scoring.calculateMatchScore(null, new UserProfile(), .8)).isZero();
    }

    @Test
    void matchingEvidenceRanksAboveMismatchOnAnHonestHundredPointScale() {
        UserProfile profile = UserProfile.builder().skills(List.of("Java", "SQL")).preferredLifestyle("REMOTE")
                .experiences(List.of(new UserProfile.Experience("Developer", "Acme", "3 years", ""))).build();
        Job match = Job.builder().techTags(List.of("Java", "SQL")).remotePolicy("REMOTE").experienceLevel("MID").build();
        Job mismatch = Job.builder().techTags(List.of("Rust", "Go")).remotePolicy("ONSITE").experienceLevel("LEAD").build();
        assertThat(scoring.calculateMatchScore(match, profile, 1.0)).isEqualTo(100);
        assertThat(scoring.calculateMatchScore(mismatch, profile, 0.0)).isLessThan(20);
    }

    @Test
    void shortAndPunctuationSkillsMatchButSubstringsDoNot() {
        Job job = Job.builder().description("JavaScript, C++, C#, Go and SQL experience").build();
        assertThat(scoring.detectMatchedSkills(job, "Java, C, C++, C#, Go, SQL"))
                .containsExactly("C++", "C#", "Go", "SQL");
    }

    @Test
    void skillCoverageUsesRequiredTagsWithoutArbitraryBoosts() {
        UserProfile profile = UserProfile.builder().skills(List.of("Java"))
                .matchWeights(Map.of("semantic", 0.0, "skills", 1.0, "lifestyle", 0.0, "experience", 0.0)).build();
        Job job = Job.builder().techTags(List.of("Java", "SQL", "java")).build();
        assertThat(scoring.calculateMatchScore(job, profile, null)).isEqualTo(50);
    }

    @Test
    void invalidWeightsAndSimilarityNeverProduceNaNOrOutOfRangeScores() {
        Map<String, Double> weights = new HashMap<>();
        weights.put("semantic", Double.NaN);
        weights.put("skills", -50.0);
        weights.put("lifestyle", Double.POSITIVE_INFINITY);
        weights.put("experience", Double.MAX_VALUE);
        UserProfile profile = UserProfile.builder().matchWeights(weights).build();
        double value = scoring.calculateMatchScore(Job.builder().experienceLevel("JUNIOR").build(),
                profile, Double.POSITIVE_INFINITY);
        assertThat(Double.isFinite(value)).isTrue();
        assertThat(value).isBetween(0.0, 100.0);
    }

    @Test
    void monthsAreNotRoundedUpToWholeYears() {
        assertThat(scoring.parseDurationYears("6 months")).isZero();
        assertThat(scoring.parseDurationYears("18 months")).isEqualTo(1);
        assertThat(scoring.parseDurationYears("Jan 2020 - Mar 2023")).isEqualTo(3);
        assertThat(scoring.parseDurationYears(null)).isZero();
    }
}
