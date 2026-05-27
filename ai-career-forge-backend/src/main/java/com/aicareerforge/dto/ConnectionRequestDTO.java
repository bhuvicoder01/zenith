package com.aicareerforge.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ConnectionRequestDTO {
    private String id;
    private PublicProfileDTO user;
    private Instant createdAt;
}
