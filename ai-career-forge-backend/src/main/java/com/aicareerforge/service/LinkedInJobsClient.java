package com.aicareerforge.service;

import com.aicareerforge.dto.LinkedInJobResponse;
import com.aicareerforge.dto.JobBankRealTimeResponse;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

/**
 * PRIMARY source client — LinkedIn Jobs via RapidAPI.
 * Higher result count, higher retry tolerance, priority scheduling.
 *
 * Requires: rapidapi.linkedin-jobs.key and rapidapi.linkedin-jobs.host
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class LinkedInJobsClient {

    private final RestTemplate restTemplate;

    @Value("${rapidapi.linkedin-jobs.key:NOT_CONFIGURED}")
    private String apiKey;

    @Value("${rapidapi.linkedin-jobs.host:jobbank-real-time-linkedin-indeed-glassdoor.p.rapidapi.com}")
    private String apiHost;

    private static final int DEFAULT_LIMIT = 25; // Higher than other sources — LinkedIn is primary

    public List<LinkedInJobResponse.LinkedInJobDto> searchJobs(String keyword, String location, int limit) {
        if ("NOT_CONFIGURED".equals(apiKey)) {
            log.debug("LinkedIn Jobs API key not configured. Skipping.");
            return Collections.emptyList();
        }

        try {
            HttpHeaders headers = new HttpHeaders();
            headers.set("x-rapidapi-key", apiKey);
            headers.set("x-rapidapi-host", apiHost);
            headers.setContentType(MediaType.APPLICATION_JSON);

            String country = extractCountry(location);
            String url = String.format("https://%s/job_search/V1?title=%s&location=%s&country=%s&limit=%d",
                    apiHost,
                    keyword != null ? keyword.replace(" ", "+") : "developer",
                    location != null && !location.isBlank() ? location.replace(" ", "+") : "remote",
                    country,
                    limit > 0 ? limit : DEFAULT_LIMIT);

            HttpEntity<Void> entity = new HttpEntity<>(headers);

            log.info("[PRIMARY] Fetching LinkedIn jobs for: '{}' location: '{}'", keyword, location);

            ResponseEntity<JobBankRealTimeResponse> response = restTemplate.exchange(
                url, HttpMethod.GET, entity, JobBankRealTimeResponse.class
            );

            if (response.getBody() != null && response.getBody().getItems() != null) {
                List<JobBankRealTimeResponse.JobDto> items = response.getBody().getItems();
                
                // Filter by site == "linkedin"
                List<LinkedInJobResponse.LinkedInJobDto> results = items.stream()
                        .filter(item -> item.getSite() != null && item.getSite().equalsIgnoreCase("linkedin"))
                        .map(this::mapToLinkedInDto)
                        .collect(Collectors.toList());

                int returnCount = Math.min(results.size(), limit > 0 ? limit : DEFAULT_LIMIT);
                log.info("[PRIMARY] LinkedIn returned {} jobs for: '{}'", results.size(), keyword);
                return results.subList(0, returnCount);
            }

            return Collections.emptyList();
        } catch (Exception e) {
            log.error("[PRIMARY] LinkedIn Jobs fetch failed: {}", e.getMessage());
            return Collections.emptyList();
        }
    }

    private String extractCountry(String location) {
        if (location == null) return "usa";
        String loc = location.toLowerCase();
        if (loc.contains("canada") || loc.contains("toronto") || loc.contains("vancouver") || loc.contains("montreal") || loc.contains("ca")) {
            return "canada";
        }
        return "usa";
    }

    private LinkedInJobResponse.LinkedInJobDto mapToLinkedInDto(JobBankRealTimeResponse.JobDto item) {
        LinkedInJobResponse.LinkedInJobDto dto = new LinkedInJobResponse.LinkedInJobDto();
        dto.setJobId(item.getJobId() != null ? item.getJobId().replace("li-", "") : "");
        dto.setJobTitle(item.getTitle());
        dto.setCompanyName(item.getCompany());
        dto.setCompanyUrl(item.getCompanyUrl());
        dto.setJobLocation(item.getLocation());
        dto.setJobDescription(item.getDescription());
        dto.setJobUrl(item.getJobUrl());
        dto.setJobPostedDate(item.getDatePosted());
        dto.setJobEmploymentType(item.getJobType());
        dto.setCompanyLogo(item.getCompanyLogo() != null ? item.getCompanyLogo() : item.getLogoUrl());
        dto.setSalaryRange(null);
        dto.setSeniorityLevel(item.getJobLevel());
        return dto;
    }
}
