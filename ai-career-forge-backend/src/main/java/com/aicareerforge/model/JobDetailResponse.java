package com.aicareerforge.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import java.util.List;

@Data
@AllArgsConstructor
public class JobDetailResponse {
    private Job job;
    private List<String> matchedSkills;
    private Double matchScore;
    private List<Application> existingApplications;
}
