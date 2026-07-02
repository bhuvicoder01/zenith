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

        // Retrieve weights from user profile, or default to standard parameters
        java.util.Map<String, Double> weights = profile.getMatchWeights();
        double semanticWeight = weights != null && weights.containsKey("semantic") ? weights.get("semantic") : 0.3;
        double skillsWeight = weights != null && weights.containsKey("skills") ? weights.get("skills") : 0.3;
        double lifestyleWeight = weights != null && weights.containsKey("lifestyle") ? weights.get("lifestyle") : 0.2;
        double experienceWeight = weights != null && weights.containsKey("experience") ? weights.get("experience") : 0.2;

        // Normalize weights to sum up to 1.0
        double totalWeight = semanticWeight + skillsWeight + lifestyleWeight + experienceWeight;
        if (totalWeight > 0) {
            semanticWeight /= totalWeight;
            skillsWeight /= totalWeight;
            lifestyleWeight /= totalWeight;
            experienceWeight /= totalWeight;
        } else {
            semanticWeight = 0.3;
            skillsWeight = 0.3;
            lifestyleWeight = 0.2;
            experienceWeight = 0.2;
        }

        // 1. Semantic Match Score (0 - 100)
        double semanticScore = vectorSimilarity != null ? vectorSimilarity * 100.0 : 75.0;

        // 2. Skills Match Score (0 - 100)
        double skillsScore = 0.0;
        if (profile.getSkills() != null && !profile.getSkills().isEmpty()) {
            // Check keyword matches in description
            long matchedCount = 0;
            if (job.getDescription() != null) {
                String descLower = job.getDescription().toLowerCase();
                matchedCount = profile.getSkills().stream()
                        .filter(skill -> skill.length() > 2 && descLower.contains(skill.toLowerCase()))
                        .count();
            }
            // Check techTags overlap if job has techTags
            if (job.getTechTags() != null && !job.getTechTags().isEmpty()) {
                long techTagMatches = job.getTechTags().stream()
                        .filter(tag -> profile.getSkills().stream().anyMatch(s -> s.equalsIgnoreCase(tag)))
                        .count();
                matchedCount = Math.max(matchedCount, techTagMatches);
            }
            skillsScore = Math.min((matchedCount * 1.5 / Math.max(1, profile.getSkills().size())) * 100.0, 100.0);
            if (matchedCount > 0 && skillsScore < 60) {
                skillsScore = 60.0; // base score if at least one key skill matched
            }
        }

        // 3. Lifestyle Match Score (0 - 100)
        double lifestyleScore = 75.0; // baseline fallback
        if (job.getRemotePolicy() != null && profile.getPreferredLifestyle() != null) {
            String policy = job.getRemotePolicy().toUpperCase();
            String pref = profile.getPreferredLifestyle().toUpperCase();
            if (policy.equals(pref) || (policy.contains("REMOTE") && pref.contains("REMOTE"))) {
                lifestyleScore = 100.0;
            } else if (policy.contains("HYBRID") || pref.contains("HYBRID")) {
                lifestyleScore = 80.0;
            } else {
                lifestyleScore = 40.0;
            }
        } else if (job.getLocation() != null && profile.getPreferredLocation() != null) {
            if (job.getLocation().toLowerCase().contains(profile.getPreferredLocation().toLowerCase())) {
                lifestyleScore = 95.0;
            }
        }

        // 4. Experience Match Score (0 - 100)
        double experienceScore = 75.0; // default
        int totalExpYears = estimateExperienceYears(profile);
        String jobExpReq = job.getExperienceLevel();
        if (jobExpReq != null) {
            switch (jobExpReq.toUpperCase()) {
                case "JUNIOR":
                    experienceScore = totalExpYears <= 2 ? 100.0 : 85.0; // junior gets 100%, senior overqualified gets 85%
                    break;
                case "MID":
                    if (totalExpYears >= 2 && totalExpYears <= 5) experienceScore = 100.0;
                    else if (totalExpYears < 2) experienceScore = 60.0;
                    else experienceScore = 90.0;
                    break;
                case "SENIOR":
                    if (totalExpYears >= 5 && totalExpYears <= 9) experienceScore = 100.0;
                    else if (totalExpYears < 3) experienceScore = 30.0;
                    else if (totalExpYears < 5) experienceScore = 70.0;
                    else experienceScore = 95.0;
                    break;
                case "LEAD":
                    if (totalExpYears >= 9) experienceScore = 100.0;
                    else if (totalExpYears < 5) experienceScore = 20.0;
                    else experienceScore = 75.0;
                    break;
            }
        } else if (job.getDescription() != null) {
            // fallback experience calculation
            double expBonus = calculateExperienceBonus(job.getDescription(), totalExpYears);
            experienceScore = 60.0 + (expBonus * 8.0); // map 0-5 to 60-100
        }

        // Combine weighted score
        double weightedScore = (semanticWeight * semanticScore) +
                               (skillsWeight * skillsScore) +
                               (lifestyleWeight * lifestyleScore) +
                               (experienceWeight * experienceScore);

        // Clamp between 0 and 100
        weightedScore = Math.max(0.0, Math.min(100.0, weightedScore));

        // Map to 65.0 - 100.0 range for the UI
        double mappedScore = 65.0 + (weightedScore * 0.35);
        return Math.round(mappedScore * 10.0) / 10.0;
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
