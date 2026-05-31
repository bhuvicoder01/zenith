package com.aicareerforge.service;

import com.aicareerforge.model.Job;
import com.aicareerforge.model.UserProfile;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Pure, stateless scoring engine for job-profile matching.
 * All methods are deterministic functions with zero external dependencies —
 * they can be unit tested with 100% coverage without mocking anything.
 *
 * Score anatomy (65–100 range):
 *   Base:        70.0 points
 *   Vector sim:  0–15 points  (semantic similarity from embedding search)
 *   Skill match: 0–10 points  (keyword overlap between profile skills & JD)
 *   Exp. fit:    0–5  points  (years of experience vs JD requirements)
 */
@Slf4j
@Service
public class JobScoringService {

    /**
     * Calculate a composite match score for a job-profile pair.
     *
     * @param job              the job listing
     * @param profile          the user's profile
     * @param vectorSimilarity semantic similarity score from vector search (0.0–1.0), or null
     * @return score in the range [65.0, 100.0], rounded to 1 decimal place
     */
    public double calculateMatchScore(Job job, UserProfile profile, Double vectorSimilarity) {
        if (job == null || profile == null) return 70.0;

        double baseScore = 70.0;

        // Factor 1: Vector similarity (0-15 points)
        if (vectorSimilarity != null) {
            baseScore += vectorSimilarity * 15.0;
        }

        // Factor 2: Skill overlap bonus (0-10 points)
        if (profile.getSkills() != null && job.getDescription() != null) {
            String descLower = job.getDescription().toLowerCase();
            long matchedCount = profile.getSkills().stream()
                    .filter(skill -> skill.length() > 2 && descLower.contains(skill.toLowerCase()))
                    .count();
            double skillBonus = Math.min(matchedCount * 2.0, 10.0);
            baseScore += skillBonus;
        }

        // Factor 3: Experience alignment bonus (0-5 points)
        int totalExperienceYears = estimateExperienceYears(profile);
        if (totalExperienceYears > 0 && job.getDescription() != null) {
            double expBonus = calculateExperienceBonus(job.getDescription(), totalExperienceYears);
            baseScore += expBonus;
        }

        // Clamp score between 65 and 100
        baseScore = Math.max(65.0, Math.min(100.0, baseScore));
        return Math.round(baseScore * 10.0) / 10.0; // 1 decimal place
    }

    /**
     * Detect which of the user's skills appear in the job description.
     *
     * @param job               the job listing
     * @param userProfileSkills comma or semicolon separated skill string
     * @return list of matched skill names
     */
    public List<String> detectMatchedSkills(Job job, String userProfileSkills) {
        if (job.getDescription() == null || userProfileSkills == null) return List.of();

        List<String> matched = new ArrayList<>();
        String desc = job.getDescription().toLowerCase();

        // Split comma or semicolon separated skills
        String[] skills = userProfileSkills.split("[,;]+");
        for (String skill : skills) {
            String trimmed = skill.trim();
            if (trimmed.length() > 2 && desc.contains(trimmed.toLowerCase())) {
                matched.add(trimmed);
            }
        }
        return matched;
    }

    /**
     * Estimate total years of experience from profile's experience + internship entries.
     * Parses duration strings like "2020 - 2023", "3 years", "Jan 2019 - Present", etc.
     */
    public int estimateExperienceYears(UserProfile profile) {
        int totalYears = 0;
        if (profile.getExperiences() != null) {
            for (var exp : profile.getExperiences()) {
                totalYears += parseDurationYears(exp.getDuration());
            }
        }
        if (profile.getInternships() != null) {
            for (var intern : profile.getInternships()) {
                totalYears += parseDurationYears(intern.getDuration());
            }
        }
        return totalYears;
    }

    /**
     * Parse a human-readable duration string into approximate years.
     * Handles: "X year(s)", "YYYY - YYYY", "YYYY - Present", "X month(s)".
     */
    int parseDurationYears(String duration) {
        if (duration == null || duration.isBlank()) return 0;

        // Match "X year(s)" pattern
        Matcher yearsMatcher = Pattern.compile("(\\d+)\\s*year", Pattern.CASE_INSENSITIVE).matcher(duration);
        if (yearsMatcher.find()) {
            return Integer.parseInt(yearsMatcher.group(1));
        }

        // Match "YYYY - YYYY" or "YYYY - Present/Current" pattern
        Matcher rangeMatcher = Pattern.compile("(\\d{4})\\s*[-–]\\s*(\\d{4}|[Pp]resent|[Cc]urrent|[Nn]ow)").matcher(duration);
        if (rangeMatcher.find()) {
            int startYear = Integer.parseInt(rangeMatcher.group(1));
            String endStr = rangeMatcher.group(2);
            int endYear = endStr.matches("\\d{4}") ? Integer.parseInt(endStr) : java.time.Year.now().getValue();
            return Math.max(0, endYear - startYear);
        }

        // Match "YYYY - " (meaning present)
        Matcher openRangeMatcher = Pattern.compile("(\\d{4})\\s*[-–]\\s*$").matcher(duration.trim());
        if (openRangeMatcher.find()) {
            int startYear = Integer.parseInt(openRangeMatcher.group(1));
            return Math.max(0, java.time.Year.now().getValue() - startYear);
        }

        // Match "X month(s)" pattern
        Matcher monthsMatcher = Pattern.compile("(\\d+)\\s*month", Pattern.CASE_INSENSITIVE).matcher(duration);
        if (monthsMatcher.find()) {
            int months = Integer.parseInt(monthsMatcher.group(1));
            return Math.max(1, months / 12);
        }

        return 0;
    }

    /**
     * Calculate experience alignment bonus (0-5 points).
     * If the JD asks for X years and the user has >= X, full bonus.
     */
    double calculateExperienceBonus(String jobDescription, int userYears) {
        String descLower = jobDescription.toLowerCase();
        Matcher m = Pattern.compile("(\\d+)\\+?\\s*year", Pattern.CASE_INSENSITIVE).matcher(descLower);
        if (m.find()) {
            int requiredYears = Integer.parseInt(m.group(1));
            if (userYears >= requiredYears) {
                return 5.0; // Full bonus: meets or exceeds requirement
            } else if (userYears >= requiredYears - 1) {
                return 3.0; // Close match: within 1 year
            } else {
                return 1.0; // Has some experience but below requirement
            }
        }
        // No explicit year requirement in JD — give a moderate bonus for having experience
        return userYears > 0 ? 2.5 : 0;
    }
}
