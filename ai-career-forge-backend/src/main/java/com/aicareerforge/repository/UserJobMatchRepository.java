package com.aicareerforge.repository;

import com.aicareerforge.model.UserJobMatch;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserJobMatchRepository extends MongoRepository<UserJobMatch, String> {
    java.util.List<com.aicareerforge.model.UserJobMatch> findByUserIdOrderByMatchScoreDesc(String userId);
    Optional<UserJobMatch> findFirstByUserIdAndJobId(String userId, String jobId);
    void deleteAllByUserId(String userId);
    java.util.List<UserJobMatch> findByUserIdAndPipelineStageIn(String userId, java.util.Collection<String> stages);
}
