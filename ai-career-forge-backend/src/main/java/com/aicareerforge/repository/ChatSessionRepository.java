package com.aicareerforge.repository;

import com.aicareerforge.model.ChatSession;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ChatSessionRepository extends MongoRepository<ChatSession, String> {
    List<ChatSession> findByUserIdOrderByLastUpdatedAtDesc(String userId);
    Optional<ChatSession> findByIdAndUserId(String id, String userId);
}
