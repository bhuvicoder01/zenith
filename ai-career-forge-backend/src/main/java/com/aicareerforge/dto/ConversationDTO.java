package com.aicareerforge.dto;

import com.aicareerforge.model.DirectMessage;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ConversationDTO {
    private PublicProfileDTO otherUser;
    private DirectMessage lastMessage;
    private long unreadCount;
}
