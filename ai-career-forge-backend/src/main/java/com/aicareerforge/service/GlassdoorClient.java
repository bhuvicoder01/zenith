package com.aicareerforge.service;

import com.aicareerforge.dto.GlassdoorJobResponse;
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
 * Glassdoor Jobs client via RapidAPI.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class GlassdoorClient {

    private final RestTemplate restTemplate;

    @Value("${rapidapi.glassdoor.key:NOT_CONFIGURED}")
    private String apiKey;

    @Value("${rapidapi.glassdoor.host:jobbank-real-time-linkedin-indeed-glassdoor.p.rapidapi.com}")
    private String apiHost;

    public List<GlassdoorJobResponse.GlassdoorJobDto> searchJobs(String keyword, String location, int limit) {
        if ("NOT_CONFIGURED".equals(apiKey)) {
            log.debug("Glassdoor API key not configured. Skipping.");
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

            log.info("Fetching Glassdoor jobs for: '{}' location: '{}'", keyword, location);

            ResponseEntity<JobBankRealTimeResponse> response = restTemplate.exchange(
                url, HttpMethod.GET, entity, JobBankRealTimeResponse.class
            );

            if (response.getBody() != null && response.getBody().getItems() != null) {
                List<JobBankRealTimeResponse.JobDto> items = response.getBody().getItems();
                
                // Filter by site == "glassdoor"
                List<GlassdoorJobResponse.GlassdoorJobDto> results = items.stream()
                        .filter(item -> item.getSite() != null && item.getSite().equalsIgnoreCase("glassdoor"))
                        .map(this::mapToGlassdoorDto)
                        .collect(Collectors.toList());

                int cap = Math.min(results.size(), limit > 0 ? limit : 15);
                log.info("Glassdoor returned {} jobs for: '{}'", results.size(), keyword);
                return results.subList(0, cap);
            }
            return Collections.emptyList();
        } catch (Exception e) {
            log.error("Glassdoor Jobs fetch failed: {}", e.getMessage());
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

    private GlassdoorJobResponse.GlassdoorJobDto mapToGlassdoorDto(JobBankRealTimeResponse.JobDto item) {
        GlassdoorJobResponse.GlassdoorJobDto dto = new GlassdoorJobResponse.GlassdoorJobDto();
        dto.setJobId(item.getJobId() != null ? item.getJobId().replace("gd-", "") : "");
        dto.setJobTitle(item.getTitle());
        dto.setEmployerName(item.getCompany());
        dto.setEmployerLogo(item.getCompanyLogo() != null ? item.getCompanyLogo() : item.getLogoUrl());
        dto.setLocation(item.getLocation());
        dto.setDescription(item.getDescription());
        dto.setApplyUrl(item.getJobUrl());
        dto.setSalaryMin(null);
        dto.setSalaryMax(null);
        dto.setJobType(item.getJobType());
        dto.setDatePosted(item.getDatePosted());
        dto.setEmployerRating(null);
        return dto;
    }
}
