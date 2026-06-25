package com.aicareerforge.repository;

import com.aicareerforge.model.Hashtag;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface HashtagRepository extends MongoRepository<Hashtag, String> {
    Optional<Hashtag> findByNameIgnoreCase(String name);
    boolean existsByNameIgnoreCase(String name);
}
