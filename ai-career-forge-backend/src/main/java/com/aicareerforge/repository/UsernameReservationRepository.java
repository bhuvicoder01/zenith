package com.aicareerforge.repository;

import com.aicareerforge.model.UsernameReservation;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Repository
public interface UsernameReservationRepository extends MongoRepository<UsernameReservation, String> {
    Optional<UsernameReservation> findByUsername(String username);
    List<UsernameReservation> findByReservedForUserIdAndReservedUntilAfter(String reservedForUserId, Instant reservedUntil);
}
