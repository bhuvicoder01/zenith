package com.aicareerforge.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;
import java.util.List;

/**
 * Response DTO for Indeed Jobs via RapidAPI.
 * API: rapidapi.com/indeed-indeed-default/api/indeed12
 */
@Data
public class IndeedJobResponse {

    private List<IndeedJobDto> results;
    private int totalResults;

    @Data
    public static class IndeedJobDto {
        @JsonProperty("job_id")
        private String jobId;

        private String title;

        @JsonProperty("company_name")
        private String companyName;

        private String location;
        private String description;
        private String salary;

        @JsonProperty("job_url")
        private String jobUrl;

        @JsonProperty("date_posted")
        private String datePosted;

        @JsonProperty("job_type")
        private String jobType;

        @JsonProperty("company_logo")
        private String companyLogo;
    }
}
