package com.aicareerforge.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;
import java.util.List;

@Data
public class JobBankRealTimeResponse {
    private boolean ok;
    private int total;
    private int count;
    private List<JobDto> items;

    @Data
    public static class JobDto {
        @JsonProperty("job_id")
        private String jobId;

        private String title;
        private String description;

        @JsonProperty("job_url")
        private String jobUrl;

        @JsonProperty("date_posted")
        private String datePosted;

        @JsonProperty("job_type")
        private String jobType;

        @JsonProperty("job_level")
        private String jobLevel;

        private String location;
        private String country;
        private String site;

        @JsonProperty("logo_url")
        private String logoUrl;

        private String company;

        @JsonProperty("company_url")
        private String companyUrl;

        @JsonProperty("company_logo")
        private String companyLogo;

        @JsonProperty("Remote")
        private boolean remote;

        @JsonProperty("PartTime")
        private boolean partTime;
    }
}
