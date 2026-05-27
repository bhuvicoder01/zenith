package com.aicareerforge.repository;

import com.aicareerforge.model.Connection;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ConnectionRepository extends MongoRepository<Connection, String> {

    Optional<Connection> findByRequesterIdAndReceiverId(String requesterId, String receiverId);

    @Query("{ '$or': [ { 'requesterId': ?0, 'receiverId': ?1 }, { 'requesterId': ?1, 'receiverId': ?0 } ] }")
    Optional<Connection> findConnectionBetween(String userId1, String userId2);

    List<Connection> findByReceiverIdAndStatus(String receiverId, Connection.Status status);

    List<Connection> findByRequesterIdAndStatus(String requesterId, Connection.Status status);

    @Query("{ 'status': 'ACCEPTED', '$or': [ { 'requesterId': ?0 }, { 'receiverId': ?0 } ] }")
    List<Connection> findAcceptedConnections(String userId);
}
