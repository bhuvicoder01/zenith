package com.aicareerforge.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;
import java.util.List;

/**
 * Response DTO for Glassdoor Jobs via RapidAPI.
 * API: rapidapi.com/adrian-api/api/glassdoor-jobs
 */
@Data
public class GlassdoorJobResponse {

    private List<GlassdoorJobDto> data;
    private int totalCount;

    @Data
    public static class GlassdoorJobDto {
        @JsonProperty("job_id")
        private String jobId;

        @JsonProperty("job_title")
        private String jobTitle;

        @JsonProperty("employer_name")
        private String employerName;

        @JsonProperty("employer_logo")
        private String employerLogo;

        private String location;
        private String description;

        @JsonProperty("apply_url")
        private String applyUrl;

        @JsonProperty("salary_min")
        private Double salaryMin;

        @JsonProperty("salary_max")
        private Double salaryMax;

        @JsonProperty("job_type")
        private String jobType;

        @JsonProperty("date_posted")
        private String datePosted;

        @JsonProperty("employer_rating")
        private Double employerRating;
    }
}
