package com.aicareerforge.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "connections")
@CompoundIndex(name = "requester_receiver_idx", def = "{'requesterId': 1, 'receiverId': 1}", unique = true)
public class Connection {

    @Id
    private String id;

    private String requesterId;
    private String receiverId;
    private Status status;

    @Builder.Default
    private Instant createdAt = Instant.now();
    
    @Builder.Default
    private Instant updatedAt = Instant.now();

    public enum Status {
        PENDING,
        ACCEPTED
    }
}
