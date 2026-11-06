package com.aicareerforge.service;

import com.aicareerforge.model.Job;
import com.aicareerforge.model.UserProfile;
import org.springframework.stereotype.Service;

import java.time.Year;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Evidence-based relevance heuristic, not a probability of being hired.
 * Default weights: semantic 30%, skills 30%, lifestyle 20%, experience 20%.
 * Unknown evidence contributes no points; scores are never lifted to a minimum.
 */
@Service
public class JobScoringService {
    private static final Pattern YEARS = Pattern.compile("(\\d+)\\s*years?", Pattern.CASE_INSENSITIVE);
    private static final Pattern MONTHS = Pattern.compile("(\\d+)\\s*months?", Pattern.CASE_INSENSITIVE);
    private static final Pattern YEAR_RANGE = Pattern.compile(
            "(\\d{4})\\s*[-\\u2013\\u2014]\\s*(?:[A-Za-z]+\\s+)?(\\d{4}|present|current|now)", Pattern.CASE_INSENSITIVE);
    private static final Pattern OPEN_YEAR_RANGE = Pattern.compile("(\\d{4})\\s*[-\\u2013\\u2014]\\s*$");
    private static final Pattern REQUIRED_YEARS = Pattern.compile("(\\d+)\\+?\\s*years?", Pattern.CASE_INSENSITIVE);

    /**
     * @return weighted relevance score in [0, 100], rounded to one decimal.
     */
    public double calculateMatchScore(Job job, UserProfile profile, Double vectorSimilarity) {
        if (job == null || profile == null) return 0;
        Map<String, Double> configured = profile.getMatchWeights();
        double semanticWeight = weight(configured, "semantic", .3);
        double skillsWeight = weight(configured, "skills", .3);
        double lifestyleWeight = weight(configured, "lifestyle", .2);
        double experienceWeight = weight(configured, "experience", .2);
        double total = semanticWeight + skillsWeight + lifestyleWeight + experienceWeight;
        if (total == 0) {
            semanticWeight = .3;
            skillsWeight = .3;
            lifestyleWeight = .2;
            experienceWeight = .2;
            total = 1;
        }

        double semantic = vectorSimilarity != null && Double.isFinite(vectorSimilarity)
                ? clamp(vectorSimilarity, 0, 1) * 100 : 0;
        double score = (semanticWeight * semantic
                + skillsWeight * skillsScore(job, profile)
                + lifestyleWeight * lifestyleScore(job, profile)
                + experienceWeight * experienceScore(job, estimateExperienceYears(profile))) / total;
        return Math.round(clamp(score, 0, 100) * 10) / 10.0;
    }

    private double skillsScore(Job job, UserProfile profile) {
        List<String> skills = normalized(profile.getSkills());
        if (skills.isEmpty()) return 0;
        List<String> requirements = normalized(job.getTechTags());
        if (!requirements.isEmpty()) {
            long matches = requirements.stream().filter(skills::contains).count();
            return matches * 100.0 / requirements.size();
        }
        if (job.getDescription() == null || job.getDescription().isBlank()) return 0;
        long matches = skills.stream().filter(skill -> mentions(job.getDescription(), skill)).count();
        return matches * 100.0 / skills.size();
    }

    private double lifestyleScore(Job job, UserProfile profile) {
        String policy = normalize(job.getRemotePolicy());
        String preference = normalize(profile.getPreferredLifestyle());
        if (!policy.isEmpty() && !preference.isEmpty()) {
            if (policy.equals(preference)) return 100;
            if (policy.equals("hybrid") && (preference.equals("remote") || preference.equals("onsite"))) return 50;
            if (preference.equals("hybrid")) return 50;
            return 0;
        }
        String preferredLocation = normalize(profile.getPreferredLocation());
        String location = normalize(job.getLocation());
        return !preferredLocation.isEmpty() && !location.isEmpty() && location.contains(preferredLocation) ? 100 : 0;
    }

    private double experienceScore(Job job, int userYears) {
        int required = switch (normalize(job.getExperienceLevel())) {
            case "junior", "entry", "entry-level" -> 0;
            case "mid", "mid-level" -> 2;
            case "senior" -> 5;
            case "lead" -> 9;
            default -> -1;
        };
        if (job.getDescription() != null) {
            Matcher explicit = REQUIRED_YEARS.matcher(job.getDescription());
            if (explicit.find()) required = number(explicit.group(1));
        }
        if (required < 0) return 0;
        if (required == 0) return 100;
        return Math.min(100, userYears * 100.0 / required);
    }

    public List<String> detectMatchedSkills(Job job, String userProfileSkills) {
        if (job == null || job.getDescription() == null || userProfileSkills == null) return List.of();
        return Arrays.stream(userProfileSkills.split("[,;]+"))
                .map(String::trim).filter(skill -> !skill.isEmpty())
                .filter(skill -> mentions(job.getDescription(), skill)).distinct().toList();
    }

    private boolean mentions(String description, String skill) {
        // Token boundaries prevent Java matching JavaScript, or C matching C++/C#.
        return Pattern.compile("(?<![\\p{L}\\p{N}_+#])" + Pattern.quote(skill)
                + "(?![\\p{L}\\p{N}_+#])", Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE)
                .matcher(description).find();
    }

    /** Approximate complete years from profile entries; overlapping roles may still overlap in time. */
    public int estimateExperienceYears(UserProfile profile) {
        if (profile == null) return 0;
        long years = 0;
        if (profile.getExperiences() != null) {
            for (var experience : profile.getExperiences()) {
                if (experience != null) years += parseDurationYears(experience.getDuration());
            }
        }
        if (profile.getInternships() != null) {
            for (var internship : profile.getInternships()) {
                if (internship != null) years += parseDurationYears(internship.getDuration());
            }
        }
        return (int) Math.min(Integer.MAX_VALUE, years);
    }

    int parseDurationYears(String duration) {
        if (duration == null || duration.isBlank()) return 0;
        Matcher years = YEARS.matcher(duration);
        if (years.find()) return number(years.group(1));
        Matcher range = YEAR_RANGE.matcher(duration);
        if (range.find()) {
            int start = number(range.group(1));
            int end = range.group(2).matches("\\d{4}") ? number(range.group(2)) : Year.now().getValue();
            return Math.max(0, end - start);
        }
        Matcher openRange = OPEN_YEAR_RANGE.matcher(duration);
        if (openRange.find()) return Math.max(0, Year.now().getValue() - number(openRange.group(1)));
        Matcher months = MONTHS.matcher(duration);
        if (months.find()) return number(months.group(1)) / 12;
        return 0;
    }

    double calculateExperienceBonus(String jobDescription, int userYears) {
        if (jobDescription == null) return 0;
        Matcher required = REQUIRED_YEARS.matcher(jobDescription);
        if (!required.find()) return 0;
        int years = number(required.group(1));
        return years == 0 ? 5 : Math.min(5, Math.max(0, userYears) * 5.0 / years);
    }

    private static int number(String value) {
        try {
            return Integer.parseInt(value);
        } catch (NumberFormatException ignored) {
            return 0;
        }
    }

    private static List<String> normalized(List<String> values) {
        return values == null ? List.of() : values.stream().filter(Objects::nonNull)
                .map(JobScoringService::normalize).filter(value -> !value.isEmpty()).distinct().toList();
    }

    private static String normalize(String value) {
        return value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
    }

    private static double weight(Map<String, Double> weights, String key, double fallback) {
        if (weights == null || !weights.containsKey(key) || weights.get(key) == null) return fallback;
        double value = weights.get(key);
        return Double.isFinite(value) ? clamp(value, 0, 1) : 0;
    }

    private static double clamp(double value, double min, double max) {
        return Math.max(min, Math.min(max, value));
    }
}
