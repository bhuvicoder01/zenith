package com.aicareerforge.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReactingUserDto {
    private String userId;
    private String fullName;
    private String username;
    private String profilePhotoUrl;
    private String headline;
    private String emoji;
}
