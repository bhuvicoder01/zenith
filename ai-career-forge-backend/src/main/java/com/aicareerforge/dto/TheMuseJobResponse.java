package com.aicareerforge.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;
import java.util.List;

/**
 * Response DTO for The Muse public API.
 * API: https://www.themuse.com/api/public/jobs
 */
@Data
public class TheMuseJobResponse {

    private int page;

    @JsonProperty("page_count")
    private int pageCount;

    private List<TheMuseJobDto> results;

    @Data
    public static class TheMuseJobDto {
        private Long id;
        private String name; // job title

        @JsonProperty("short_name")
        private String shortName;

        private TheMuseCompany company;
        private List<TheMuseLocation> locations;
        private List<TheMuseLevel> levels;
        private List<TheMuseCategory> categories;

        @JsonProperty("publication_date")
        private String publicationDate;

        private TheMuseRefs refs;
        private String contents; // HTML job description
        private String type; // e.g. "external"

        @Data
        public static class TheMuseCompany {
            private Long id;
            private String name;

            @JsonProperty("short_name")
            private String shortName;
        }

        @Data
        public static class TheMuseLocation {
            private String name;
        }

        @Data
        public static class TheMuseLevel {
            private String name;

            @JsonProperty("short_name")
            private String shortName;
        }

        @Data
        public static class TheMuseCategory {
            private String name;
        }

        @Data
        public static class TheMuseRefs {
            @JsonProperty("landing_page")
            private String landingPage;
        }
    }
}
