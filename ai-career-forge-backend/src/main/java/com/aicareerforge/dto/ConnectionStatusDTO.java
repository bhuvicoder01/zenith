package com.aicareerforge.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ConnectionStatusDTO {
    private String status; // "NONE", "PENDING_SENT", "PENDING_RECEIVED", "CONNECTED"
    private String connectionId;
}
