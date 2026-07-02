package com.aicareerforge.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "direct_messages")
public class DirectMessage {

    @Id
    private String id;

    private String senderId;
    private String receiverId;
    private String content;

    @Builder.Default
    private Instant timestamp = Instant.now();

    private boolean isRead;
    private Instant readAt;

    private boolean deletedBySender;
    private boolean deletedByReceiver;

    @org.springframework.data.annotation.Transient
    private String senderPublicKey;
}

