package com.aicareerforge.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;
import java.util.List;

/**
 * Response DTO for LinkedIn Jobs Search via RapidAPI.
 * API: rapidapi.com/jaypat87/api/linkedin-jobs-search
 */
@Data
public class LinkedInJobResponse {

    private List<LinkedInJobDto> data;

    @Data
    public static class LinkedInJobDto {
        @JsonProperty("job_id")
        private String jobId;

        @JsonProperty("job_title")
        private String jobTitle;

        @JsonProperty("company_name")
        private String companyName;

        @JsonProperty("company_url")
        private String companyUrl;

        @JsonProperty("job_location")
        private String jobLocation;

        @JsonProperty("job_description")
        private String jobDescription;

        @JsonProperty("job_url")
        private String jobUrl;

        @JsonProperty("job_posted_date")
        private String jobPostedDate;

        @JsonProperty("job_employment_type")
        private String jobEmploymentType;

        @JsonProperty("company_logo")
        private String companyLogo;

        @JsonProperty("salary_range")
        private String salaryRange;

        @JsonProperty("seniority_level")
        private String seniorityLevel;
    }
}
