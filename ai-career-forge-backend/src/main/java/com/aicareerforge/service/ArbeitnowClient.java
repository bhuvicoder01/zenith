package com.aicareerforge.service;

import com.aicareerforge.dto.ArbeitnowJobResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.Collections;
import java.util.List;

/**
 * Arbeitnow client — free public API, no key required.
 * Provides EU/global tech jobs with tags and remote indicators.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ArbeitnowClient {

    private final RestTemplate restTemplate;

    private static final String BASE_URL = "https://www.arbeitnow.com/api/job-board-api";

    public List<ArbeitnowJobResponse.ArbeitnowJobDto> searchJobs(int page, int limit) {
        try {
            String url = UriComponentsBuilder.fromHttpUrl(BASE_URL)
                    .queryParam("page", Math.max(1, page))
                    .toUriString();

            log.info("Fetching Arbeitnow jobs: {}", url);

            ArbeitnowJobResponse response = restTemplate.getForObject(url, ArbeitnowJobResponse.class);
            if (response != null && response.getData() != null) {
                List<ArbeitnowJobResponse.ArbeitnowJobDto> results = response.getData();
                int cap = Math.min(results.size(), limit > 0 ? limit : 15);
                log.info("Arbeitnow returned {} jobs", results.size());
                return results.subList(0, cap);
            }
            return Collections.emptyList();
        } catch (Exception e) {
            log.error("Arbeitnow fetch failed: {}", e.getMessage());
            return Collections.emptyList();
        }
    }
}
