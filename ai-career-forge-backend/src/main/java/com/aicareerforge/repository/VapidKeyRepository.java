package com.aicareerforge.repository;

import com.aicareerforge.model.VapidKey;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface VapidKeyRepository extends MongoRepository<VapidKey, String> {
}
