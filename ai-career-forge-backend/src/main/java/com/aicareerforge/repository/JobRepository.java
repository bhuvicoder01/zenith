package com.aicareerforge.repository;

import com.aicareerforge.model.Job;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface JobRepository extends MongoRepository<Job, String> {
    boolean existsBySourceJobId(String sourceJobId);
    boolean existsBySourceJobIdAndUserId(String sourceJobId, String userId);
    boolean existsBySourceJobIdAndUserIdIsNull(String sourceJobId);
    Optional<Job> findBySourceJobId(String sourceJobId);
    Optional<Job> findBySourceJobIdAndUserId(String sourceJobId, String userId);
    Optional<Job> findBySourceJobIdAndUserIdIsNull(String sourceJobId);
    List<Job> findByUserId(String userId);
    List<Job> findByPostedBy(String postedBy);
    @Query("{ 'userId': null, '$or': [ { 'title': { '$regex': ?0, '$options': 'i' } }, { 'description': { '$regex': ?0, '$options': 'i' } } ] }")
    List<Job> findFallbackJobs(String skill);

    List<Job> findTop50ByUserIdIsNullOrderByPostedDateDesc();
    void deleteAllByUserId(String userId);

    // ─── Admin Stats & Pagination ────────────────────────────
    long countByStatus(Job.JobStatus status);
    long countBySource(String source);

    Page<Job> findByStatus(Job.JobStatus status, Pageable pageable);
    Page<Job> findBySource(String source, Pageable pageable);
    Page<Job> findByStatusAndSource(Job.JobStatus status, String source, Pageable pageable);

    @Query("{ '$or': [ { 'title': { '$regex': ?0, '$options': 'i' } }, { 'company': { '$regex': ?0, '$options': 'i' } }, { 'description': { '$regex': ?0, '$options': 'i' } } ] }")
    Page<Job> searchJobs(String keyword, Pageable pageable);

    long deleteByStatus(Job.JobStatus status);
}

