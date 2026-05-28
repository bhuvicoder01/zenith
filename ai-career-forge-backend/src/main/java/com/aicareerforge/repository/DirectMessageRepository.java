package com.aicareerforge.repository;

import com.aicareerforge.model.DirectMessage;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;

import java.util.List;

public interface DirectMessageRepository extends MongoRepository<DirectMessage, String> {

    @Query("{$or: [{senderId: ?0, receiverId: ?1, deletedBySender: {$ne: true}}, {senderId: ?1, receiverId: ?0, deletedByReceiver: {$ne: true}}]}")
    List<DirectMessage> findChatHistory(String userId1, String userId2, Sort sort);

    @Query("{$or: [{senderId: ?0, deletedBySender: {$ne: true}}, {receiverId: ?0, deletedByReceiver: {$ne: true}}]}")
    List<DirectMessage> findActiveMessagesForUser(String userId, Sort sort);

    @Query("{receiverId: ?0, senderId: ?1, isRead: ?2, deletedByReceiver: {$ne: true}}")
    List<DirectMessage> findUnreadMessagesForChat(String receiverId, String senderId, boolean isRead);
    
    @Query(value = "{receiverId: ?0, isRead: ?1, deletedByReceiver: {$ne: true}}", count = true)
    long countByReceiverIdAndIsReadAndDeletedByReceiverFalse(String receiverId, boolean isRead);
}
