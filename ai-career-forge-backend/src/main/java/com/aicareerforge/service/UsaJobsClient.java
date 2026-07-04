package com.aicareerforge.service;

import com.aicareerforge.dto.UsaJobsResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.Collections;
import java.util.List;

/**
 * USAJobs.gov client — free federal job API.
 * Requires an API key (free registration with email at developer.usajobs.gov).
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class UsaJobsClient {

    private final RestTemplate restTemplate;

    @Value("${usajobs.api-key:NOT_CONFIGURED}")
    private String apiKey;

    @Value("${usajobs.email:NOT_CONFIGURED}")
    private String userAgent;

    private static final String BASE_URL = "https://data.usajobs.gov/api/Search";

    public List<UsaJobsResponse.SearchResultItem> searchJobs(String keyword, String location, int limit) {
        if ("NOT_CONFIGURED".equals(apiKey)) {
            log.debug("USAJobs API key not configured. Skipping.");
            return Collections.emptyList();
        }

        try {
            HttpHeaders headers = new HttpHeaders();
            headers.set("Authorization-Key", apiKey);
            headers.set("User-Agent", userAgent);
            headers.set("Host", "data.usajobs.gov");

            UriComponentsBuilder builder = UriComponentsBuilder.fromHttpUrl(BASE_URL)
                    .queryParam("ResultsPerPage", Math.min(limit > 0 ? limit : 15, 25));

            if (keyword != null && !keyword.isBlank()) {
                builder.queryParam("Keyword", keyword);
            }
            if (location != null && !location.isBlank()) {
                builder.queryParam("LocationName", location);
            }

            HttpEntity<Void> entity = new HttpEntity<>(headers);
            String url = builder.toUriString();

            log.info("Fetching USAJobs for: '{}' location: '{}'", keyword, location);

            ResponseEntity<UsaJobsResponse> response = restTemplate.exchange(
                url, HttpMethod.GET, entity, UsaJobsResponse.class
            );

            if (response.getBody() != null
                    && response.getBody().getSearchResult() != null
                    && response.getBody().getSearchResult().getSearchResultItems() != null) {
                List<UsaJobsResponse.SearchResultItem> results = response.getBody().getSearchResult().getSearchResultItems();
                log.info("USAJobs returned {} jobs for: '{}'", results.size(), keyword);
                return results;
            }
            return Collections.emptyList();
        } catch (Exception e) {
            log.error("USAJobs fetch failed: {}", e.getMessage());
            return Collections.emptyList();
        }
    }
}
