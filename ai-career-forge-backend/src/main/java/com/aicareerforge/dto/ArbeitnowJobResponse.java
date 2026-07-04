package com.aicareerforge.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;
import java.util.List;

/**
 * Response DTO for Arbeitnow public API.
 * API: https://www.arbeitnow.com/api/job-board-api
 */
@Data
public class ArbeitnowJobResponse {

    private List<ArbeitnowJobDto> data;
    private ArbeitnowLinks links;
    private ArbeitnowMeta meta;

    @Data
    public static class ArbeitnowJobDto {
        private String slug;
        private String title;
        private String description;

        @JsonProperty("company_name")
        private String companyName;

        private String location;
        private boolean remote;
        private String url;
        private List<String> tags;

        @JsonProperty("job_types")
        private List<String> jobTypes;

        @JsonProperty("created_at")
        private Long createdAt;
    }

    @Data
    public static class ArbeitnowLinks {
        private String first;
        private String last;
        private String prev;
        private String next;
    }

    @Data
    public static class ArbeitnowMeta {
        @JsonProperty("current_page")
        private int currentPage;

        @JsonProperty("last_page")
        private int lastPage;

        private String path;

        @JsonProperty("per_page")
        private int perPage;

        private int total;
    }
}
