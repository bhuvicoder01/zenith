package com.aicareerforge.service;

import com.aicareerforge.dto.AdzunaJobResponse;
import com.aicareerforge.dto.JSearchJobResponse;
import com.aicareerforge.dto.RemotiveJobResponse;
import com.aicareerforge.model.Job;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Converts provider-specific DTOs into the canonical {@link Job} model.
 * All provider quirks (field naming, salary parsing, HTML stripping) are
 * isolated here so the rest of the pipeline works with clean, normalized data.
 */
@Slf4j
@Service
public class JobNormalizationService {

    /**
     * Convert an Adzuna API response DTO into a canonical Job.
     */
    public Job fromAdzuna(AdzunaJobResponse.AdzunaJobDto dto, String userId) {
        String sourceJobId = "adzuna-" + dto.getId();
        return Job.builder()
                .userId(userId)
                .title(dto.getTitle())
                .company(dto.getCompany() != null ? dto.getCompany().getDisplayName() : "Unknown")
                .location(dto.getLocation() != null ? dto.getLocation().getDisplayName() : "Unknown")
                .description(dto.getDescription())
                .salaryMin(dto.getSalaryMin())
                .salaryMax(dto.getSalaryMax())
                .url(dto.getRedirectUrl())
                .source("adzuna")
                .sourceJobId(sourceJobId)
                .postedDate(LocalDateTime.now())
                .firstSeenAt(LocalDateTime.now())
                .lastSeenAt(LocalDateTime.now())
                .status(Job.JobStatus.ACTIVE)
                .build();
    }

    /**
     * Convert a Remotive API response DTO into a canonical Job.
     * Handles free-text salary parsing and HTML description stripping.
     */
    public Job fromRemotive(RemotiveJobResponse.RemotiveJobDto dto, String userId) {
        String sourceJobId = "remotive-" + dto.getId();

        // Parse salary range from Remotive's free-text salary field
        Double[] salary = parseSalaryRange(dto.getSalary());

        return Job.builder()
                .userId(userId)
                .title(dto.getTitle())
                .company(dto.getCompanyName() != null ? dto.getCompanyName() : "Unknown")
                .location(dto.getCandidateRequiredLocation() != null ? dto.getCandidateRequiredLocation() : "Remote")
                .description(stripHtml(dto.getDescription()))
                .salaryMin(salary[0])
                .salaryMax(salary[1])
                .url(dto.getUrl())
                .jobType(dto.getJobType())
                .source("remotive")
                .sourceJobId(sourceJobId)
                .companyLogoUrl(dto.getCompanyLogo())
                .postedDate(LocalDateTime.now())
                .firstSeenAt(LocalDateTime.now())
                .lastSeenAt(LocalDateTime.now())
                .status(Job.JobStatus.ACTIVE)
                .build();
    }

    /**
     * Convert a JSearch (RapidAPI) response DTO into a canonical Job.
     * Handles multi-part location formatting.
     */
    public Job fromJSearch(JSearchJobResponse.JSearchJobDto dto, String userId) {
        String sourceJobId = "jsearch-" + dto.getJobId();

        // Format location from separate city/state/country fields
        String jobLocation = formatJSearchLocation(dto);

        return Job.builder()
                .userId(userId)
                .title(dto.getJobTitle())
                .company(dto.getEmployerName() != null ? dto.getEmployerName() : "Unknown")
                .location(jobLocation)
                .description(dto.getJobDescription())
                .salaryMin(dto.getJobMinSalary())
                .salaryMax(dto.getJobMaxSalary())
                .url(dto.getJobApplyLink())
                .jobType(dto.getJobEmploymentType())
                .source("jsearch")
                .sourceJobId(sourceJobId)
                .companyLogoUrl(dto.getEmployerLogo())
                .postedDate(LocalDateTime.now())
                .firstSeenAt(LocalDateTime.now())
                .lastSeenAt(LocalDateTime.now())
                .status(Job.JobStatus.ACTIVE)
                .build();
    }

    /**
     * Parse a free-text salary string into [min, max].
     * Handles formats like "$50,000 - $80,000", "50000-80000", "70K", etc.
     *
     * @return Double[2] where index 0 is min and index 1 is max (both nullable)
     */
    public Double[] parseSalaryRange(String salaryText) {
        Double salaryMin = null;
        Double salaryMax = null;

        if (salaryText != null && !salaryText.isBlank()) {
            try {
                Matcher salaryMatcher = Pattern.compile("(\\d[\\d,]*)").matcher(salaryText.replace(",", ""));
                List<Double> salaryValues = new ArrayList<>();
                while (salaryMatcher.find()) {
                    salaryValues.add(Double.parseDouble(salaryMatcher.group(1)));
                }
                if (salaryValues.size() >= 2) {
                    salaryMin = salaryValues.get(0);
                    salaryMax = salaryValues.get(1);
                } else if (salaryValues.size() == 1) {
                    salaryMin = salaryValues.get(0);
                    salaryMax = salaryValues.get(0);
                }
            } catch (Exception e) {
                log.debug("Could not parse salary: {}", salaryText);
            }
        }

        return new Double[]{salaryMin, salaryMax};
    }

    /**
     * Strip HTML tags from job descriptions (e.g., Remotive sends HTML).
     */
    public String stripHtml(String html) {
        if (html == null) return null;
        return html.replaceAll("<[^>]*>", " ")
                   .replaceAll("&amp;", "&")
                   .replaceAll("&lt;", "<")
                   .replaceAll("&gt;", ">")
                   .replaceAll("&nbsp;", " ")
                   .replaceAll("\\s+", " ")
                   .trim();
    }

    /**
     * Format JSearch's separate location fields into a single string.
     */
    private String formatJSearchLocation(JSearchJobResponse.JSearchJobDto dto) {
        String jobLocation = "Remote";
        if (dto.getJobCity() != null) jobLocation = dto.getJobCity();
        if (dto.getJobState() != null) jobLocation += ", " + dto.getJobState();
        if (dto.getJobCountry() != null) jobLocation += " (" + dto.getJobCountry() + ")";
        return jobLocation;
    }
}
