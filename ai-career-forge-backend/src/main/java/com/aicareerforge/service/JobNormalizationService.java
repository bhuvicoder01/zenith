package com.aicareerforge.service;

import com.aicareerforge.dto.*;
import com.aicareerforge.model.Job;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * Converts provider-specific DTOs into the canonical {@link Job} model.
 * All provider quirks (field naming, salary parsing, HTML stripping) are
 * isolated here so the rest of the pipeline works with clean, normalized data.
 *
 * Supports 9 sources: LinkedIn (primary), Adzuna, Remotive, JSearch,
 * Indeed, Glassdoor, The Muse, Arbeitnow, USAJobs.
 */
@Slf4j
@Service
public class JobNormalizationService {

    // ─── LinkedIn (PRIMARY) ──────────────────────────────────

    /**
     * Convert a LinkedIn Jobs API response into a canonical Job.
     * LinkedIn is the primary source — jobs get a source priority flag.
     */
    public Job fromLinkedIn(LinkedInJobResponse.LinkedInJobDto dto, String userId) {
        String sourceJobId = "linkedin-" + dto.getJobId();

        Double[] salary = parseSalaryRange(dto.getSalaryRange());

        return Job.builder()
                .userId(userId)
                .title(dto.getJobTitle())
                .company(dto.getCompanyName() != null ? dto.getCompanyName() : "Unknown")
                .location(dto.getJobLocation() != null ? dto.getJobLocation() : "Remote")
                .description(stripHtml(dto.getJobDescription()))
                .salaryMin(salary[0])
                .salaryMax(salary[1])
                .url(dto.getJobUrl())
                .jobType(dto.getJobEmploymentType())
                .source("linkedin")
                .sourceJobId(sourceJobId)
                .companyLogoUrl(dto.getCompanyLogo())
                .postedDate(LocalDateTime.now())
                .firstSeenAt(LocalDateTime.now())
                .lastSeenAt(LocalDateTime.now())
                .status(Job.JobStatus.ACTIVE)
                .build();
    }

    // ─── Adzuna ──────────────────────────────────────────────

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

    // ─── Remotive ────────────────────────────────────────────

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

    // ─── JSearch ─────────────────────────────────────────────

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

    // ─── Indeed ──────────────────────────────────────────────

    /**
     * Convert an Indeed API response DTO into a canonical Job.
     */
    public Job fromIndeed(IndeedJobResponse.IndeedJobDto dto, String userId) {
        String sourceJobId = "indeed-" + dto.getJobId();

        Double[] salary = parseSalaryRange(dto.getSalary());

        return Job.builder()
                .userId(userId)
                .title(dto.getTitle())
                .company(dto.getCompanyName() != null ? dto.getCompanyName() : "Unknown")
                .location(dto.getLocation() != null ? dto.getLocation() : "Unknown")
                .description(stripHtml(dto.getDescription()))
                .salaryMin(salary[0])
                .salaryMax(salary[1])
                .url(dto.getJobUrl())
                .jobType(dto.getJobType())
                .source("indeed")
                .sourceJobId(sourceJobId)
                .companyLogoUrl(dto.getCompanyLogo())
                .postedDate(LocalDateTime.now())
                .firstSeenAt(LocalDateTime.now())
                .lastSeenAt(LocalDateTime.now())
                .status(Job.JobStatus.ACTIVE)
                .build();
    }

    // ─── Glassdoor ───────────────────────────────────────────

    /**
     * Convert a Glassdoor API response DTO into a canonical Job.
     */
    public Job fromGlassdoor(GlassdoorJobResponse.GlassdoorJobDto dto, String userId) {
        String sourceJobId = "glassdoor-" + dto.getJobId();

        return Job.builder()
                .userId(userId)
                .title(dto.getJobTitle())
                .company(dto.getEmployerName() != null ? dto.getEmployerName() : "Unknown")
                .location(dto.getLocation() != null ? dto.getLocation() : "Unknown")
                .description(stripHtml(dto.getDescription()))
                .salaryMin(dto.getSalaryMin())
                .salaryMax(dto.getSalaryMax())
                .url(dto.getApplyUrl())
                .jobType(dto.getJobType())
                .source("glassdoor")
                .sourceJobId(sourceJobId)
                .companyLogoUrl(dto.getEmployerLogo())
                .postedDate(LocalDateTime.now())
                .firstSeenAt(LocalDateTime.now())
                .lastSeenAt(LocalDateTime.now())
                .status(Job.JobStatus.ACTIVE)
                .build();
    }

    // ─── The Muse ────────────────────────────────────────────

    /**
     * Convert a The Muse API response DTO into a canonical Job.
     */
    public Job fromTheMuse(TheMuseJobResponse.TheMuseJobDto dto, String userId) {
        String sourceJobId = "themuse-" + dto.getId();

        String locationStr = "Remote";
        if (dto.getLocations() != null && !dto.getLocations().isEmpty()) {
            locationStr = dto.getLocations().stream()
                    .map(TheMuseJobResponse.TheMuseJobDto.TheMuseLocation::getName)
                    .collect(Collectors.joining(", "));
        }

        String applyUrl = null;
        if (dto.getRefs() != null) {
            applyUrl = dto.getRefs().getLandingPage();
        }

        return Job.builder()
                .userId(userId)
                .title(dto.getName())
                .company(dto.getCompany() != null ? dto.getCompany().getName() : "Unknown")
                .location(locationStr)
                .description(stripHtml(dto.getContents()))
                .url(applyUrl)
                .source("themuse")
                .sourceJobId(sourceJobId)
                .postedDate(LocalDateTime.now())
                .firstSeenAt(LocalDateTime.now())
                .lastSeenAt(LocalDateTime.now())
                .status(Job.JobStatus.ACTIVE)
                .build();
    }

    // ─── Arbeitnow ───────────────────────────────────────────

    /**
     * Convert an Arbeitnow API response DTO into a canonical Job.
     */
    public Job fromArbeitnow(ArbeitnowJobResponse.ArbeitnowJobDto dto, String userId) {
        String sourceJobId = "arbeitnow-" + dto.getSlug();

        String remotePolicy = dto.isRemote() ? "REMOTE" : "ONSITE";

        return Job.builder()
                .userId(userId)
                .title(dto.getTitle())
                .company(dto.getCompanyName() != null ? dto.getCompanyName() : "Unknown")
                .location(dto.getLocation() != null ? dto.getLocation() : (dto.isRemote() ? "Remote" : "Unknown"))
                .description(stripHtml(dto.getDescription()))
                .url(dto.getUrl())
                .remotePolicy(remotePolicy)
                .techTags(dto.getTags())
                .source("arbeitnow")
                .sourceJobId(sourceJobId)
                .postedDate(LocalDateTime.now())
                .firstSeenAt(LocalDateTime.now())
                .lastSeenAt(LocalDateTime.now())
                .status(Job.JobStatus.ACTIVE)
                .build();
    }

    // ─── USAJobs ─────────────────────────────────────────────

    /**
     * Convert a USAJobs.gov API response DTO into a canonical Job.
     */
    public Job fromUsaJobs(UsaJobsResponse.SearchResultItem item, String userId) {
        UsaJobsResponse.MatchedObjectDescriptor desc = item.getMatchedObjectDescriptor();
        String sourceJobId = "usajobs-" + item.getMatchedObjectId();

        Double salaryMin = null;
        Double salaryMax = null;
        if (desc.getPositionRemuneration() != null && !desc.getPositionRemuneration().isEmpty()) {
            UsaJobsResponse.PositionRemuneration pay = desc.getPositionRemuneration().get(0);
            try {
                salaryMin = Double.parseDouble(pay.getMinimumRange());
                salaryMax = Double.parseDouble(pay.getMaximumRange());
            } catch (NumberFormatException e) {
                // Ignore — salary not parseable
            }
        }

        String applyUrl = desc.getPositionUri();
        if (desc.getApplyUri() != null && !desc.getApplyUri().isEmpty()) {
            applyUrl = desc.getApplyUri().get(0);
        }

        String jobType = null;
        if (desc.getPositionSchedule() != null && !desc.getPositionSchedule().isEmpty()) {
            jobType = desc.getPositionSchedule().get(0).getName();
        }

        return Job.builder()
                .userId(userId)
                .title(desc.getPositionTitle())
                .company(desc.getOrganizationName() != null ? desc.getOrganizationName() : "U.S. Government")
                .location(desc.getPositionLocationDisplay() != null ? desc.getPositionLocationDisplay() : "USA")
                .description(desc.getQualificationSummary())
                .salaryMin(salaryMin)
                .salaryMax(salaryMax)
                .url(applyUrl)
                .jobType(jobType)
                .source("usajobs")
                .sourceJobId(sourceJobId)
                .postedDate(LocalDateTime.now())
                .firstSeenAt(LocalDateTime.now())
                .lastSeenAt(LocalDateTime.now())
                .status(Job.JobStatus.ACTIVE)
                .build();
    }

    // ─── Utility Methods ─────────────────────────────────────

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
