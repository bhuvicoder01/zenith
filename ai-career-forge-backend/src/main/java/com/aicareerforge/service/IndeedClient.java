package com.aicareerforge.service;

import com.aicareerforge.dto.IndeedJobResponse;
import com.aicareerforge.dto.JobBankRealTimeResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Indeed Jobs client via RapidAPI.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class IndeedClient {

    private final RestTemplate restTemplate;

    @Value("${rapidapi.indeed.key:NOT_CONFIGURED}")
    private String apiKey;

    @Value("${rapidapi.indeed.host:jobbank-real-time-linkedin-indeed-glassdoor.p.rapidapi.com}")
    private String apiHost;

    public List<IndeedJobResponse.IndeedJobDto> searchJobs(String keyword, String location, int limit) {
        if ("NOT_CONFIGURED".equals(apiKey)) {
            log.debug("Indeed API key not configured. Skipping.");
            return Collections.emptyList();
        }

        try {
            HttpHeaders headers = new HttpHeaders();
            headers.set("x-rapidapi-key", apiKey);
            headers.set("x-rapidapi-host", apiHost);

            String country = extractCountry(location);
            String url = String.format("https://%s/job_search/V1?title=%s&location=%s&country=%s&limit=%d",
                    apiHost,
                    keyword != null ? keyword.replace(" ", "+") : "developer",
                    location != null && !location.isBlank() ? location.replace(" ", "+") : "remote",
                    country,
                    limit > 0 ? limit : 15);

            HttpEntity<Void> entity = new HttpEntity<>(headers);

            log.info("Fetching Indeed jobs for: '{}' location: '{}'", keyword, location);

            ResponseEntity<JobBankRealTimeResponse> response = restTemplate.exchange(
                url, HttpMethod.GET, entity, JobBankRealTimeResponse.class
            );

            if (response.getBody() != null && response.getBody().getItems() != null) {
                List<JobBankRealTimeResponse.JobDto> items = response.getBody().getItems();
                
                // Filter by site == "indeed"
                List<IndeedJobResponse.IndeedJobDto> results = items.stream()
                        .filter(item -> item.getSite() != null && item.getSite().equalsIgnoreCase("indeed"))
                        .map(this::mapToIndeedDto)
                        .collect(Collectors.toList());

                int cap = Math.min(results.size(), limit > 0 ? limit : 15);
                log.info("Indeed returned {} jobs for: '{}'", results.size(), keyword);
                return results.subList(0, cap);
            }
            return Collections.emptyList();
        } catch (Exception e) {
            log.error("Indeed Jobs fetch failed: {}", e.getMessage());
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

    private IndeedJobResponse.IndeedJobDto mapToIndeedDto(JobBankRealTimeResponse.JobDto item) {
        IndeedJobResponse.IndeedJobDto dto = new IndeedJobResponse.IndeedJobDto();
        dto.setJobId(item.getJobId() != null ? item.getJobId().replace("ind-", "") : "");
        dto.setTitle(item.getTitle());
        dto.setCompanyName(item.getCompany());
        dto.setLocation(item.getLocation());
        dto.setDescription(item.getDescription());
        dto.setSalary(null);
        dto.setJobUrl(item.getJobUrl());
        dto.setDatePosted(item.getDatePosted());
        dto.setJobType(item.getJobType());
        dto.setCompanyLogo(item.getCompanyLogo() != null ? item.getCompanyLogo() : item.getLogoUrl());
        return dto;
    }
}
