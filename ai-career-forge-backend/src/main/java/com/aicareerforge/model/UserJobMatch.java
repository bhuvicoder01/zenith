package com.aicareerforge.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.List;

/**
 * Stores user-specific AI analysis and match scoring for a particular job.
 * This ensures that multiple users can have unique relevance explanations for the same global job listing.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "user_job_matches")
@CompoundIndex(name = "user_job_idx", def = "{'userId': 1, 'jobId': 1}", unique = true)
public class UserJobMatch {

    @Id
    private String id;
    
    private String userId;
    private String jobId;
    
    private Double matchScore;
    private String relevanceExplanation;
    private List<String> matchedSkills;

    @Builder.Default
    private String pipelineStage = "DISCOVERED"; // SAVED, APPLYING, APPLIED, INTERVIEWING, OFFER, REJECTED
}
