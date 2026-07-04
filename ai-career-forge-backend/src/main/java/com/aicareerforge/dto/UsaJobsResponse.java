package com.aicareerforge.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;
import java.util.List;

/**
 * Response DTO for USAJobs.gov public API.
 * API: https://developer.usajobs.gov/API-Reference
 */
@Data
public class UsaJobsResponse {

    @JsonProperty("SearchResult")
    private SearchResult searchResult;

    @Data
    public static class SearchResult {
        @JsonProperty("SearchResultCount")
        private int searchResultCount;

        @JsonProperty("SearchResultCountAll")
        private int searchResultCountAll;

        @JsonProperty("SearchResultItems")
        private List<SearchResultItem> searchResultItems;
    }

    @Data
    public static class SearchResultItem {
        @JsonProperty("MatchedObjectId")
        private String matchedObjectId;

        @JsonProperty("MatchedObjectDescriptor")
        private MatchedObjectDescriptor matchedObjectDescriptor;
    }

    @Data
    public static class MatchedObjectDescriptor {
        @JsonProperty("PositionTitle")
        private String positionTitle;

        @JsonProperty("OrganizationName")
        private String organizationName;

        @JsonProperty("PositionLocationDisplay")
        private String positionLocationDisplay;

        @JsonProperty("PositionLocation")
        private List<PositionLocation> positionLocation;

        @JsonProperty("QualificationSummary")
        private String qualificationSummary;

        @JsonProperty("PositionURI")
        private String positionUri;

        @JsonProperty("ApplyURI")
        private List<String> applyUri;

        @JsonProperty("PositionRemuneration")
        private List<PositionRemuneration> positionRemuneration;

        @JsonProperty("PositionSchedule")
        private List<PositionSchedule> positionSchedule;

        @JsonProperty("PublicationStartDate")
        private String publicationStartDate;

        @JsonProperty("ApplicationCloseDate")
        private String applicationCloseDate;
    }

    @Data
    public static class PositionLocation {
        @JsonProperty("LocationName")
        private String locationName;

        @JsonProperty("CountryCode")
        private String countryCode;
    }

    @Data
    public static class PositionRemuneration {
        @JsonProperty("MinimumRange")
        private String minimumRange;

        @JsonProperty("MaximumRange")
        private String maximumRange;

        @JsonProperty("RateIntervalCode")
        private String rateIntervalCode; // "Per Year", "Per Hour", etc.
    }

    @Data
    public static class PositionSchedule {
        @JsonProperty("Name")
        private String name; // "Full Time", "Part Time"
    }
}
