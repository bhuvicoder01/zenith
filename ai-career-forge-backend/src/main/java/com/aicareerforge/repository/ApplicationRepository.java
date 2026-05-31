package com.aicareerforge.repository;

import com.aicareerforge.model.Application;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ApplicationRepository extends MongoRepository<Application, String> {
    List<Application> findByUserId(String userId);
    List<Application> findByJobIdIn(java.util.List<String> jobIds);
    java.util.Optional<Application> findFirstByUserIdAndJobIdAndTemplateStyle(String userId, String jobId, String templateStyle);
    List<Application> findByUserIdAndJobId(String userId, String jobId);
}
