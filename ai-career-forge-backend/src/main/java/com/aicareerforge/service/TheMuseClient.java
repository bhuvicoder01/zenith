package com.aicareerforge.service;

import com.aicareerforge.dto.TheMuseJobResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.Collections;
import java.util.List;

/**
 * The Muse client — free public API, no key required.
 * Provides curated tech jobs with company culture info.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class TheMuseClient {

    private final RestTemplate restTemplate;

    private static final String BASE_URL = "https://www.themuse.com/api/public/jobs";

    public List<TheMuseJobResponse.TheMuseJobDto> searchJobs(String category, int page, int limit) {
        try {
            UriComponentsBuilder builder = UriComponentsBuilder.fromHttpUrl(BASE_URL)
                    .queryParam("page", Math.max(0, page))
                    .queryParam("descending", true);

            if (category != null && !category.isBlank()) {
                builder.queryParam("category", category);
            }

            String url = builder.toUriString();
            log.info("Fetching The Muse jobs: {}", url);

            TheMuseJobResponse response = restTemplate.getForObject(url, TheMuseJobResponse.class);
            if (response != null && response.getResults() != null) {
                List<TheMuseJobResponse.TheMuseJobDto> results = response.getResults();
                int cap = Math.min(results.size(), limit > 0 ? limit : 15);
                log.info("The Muse returned {} jobs", results.size());
                return results.subList(0, cap);
            }
            return Collections.emptyList();
        } catch (Exception e) {
            log.error("The Muse fetch failed: {}", e.getMessage());
            return Collections.emptyList();
        }
    }
}
