package com.aicareerforge.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

public class AuthDtos {

    @Data
    @Builder
    @AllArgsConstructor
    @NoArgsConstructor
    public static class AuthRequest {
        @NotBlank
        @Email
        @Size(max = 254)
        private String email;
        @NotBlank
        @Size(max = 72)
        private String password;
    }

    @Data
    @Builder
    @AllArgsConstructor
    @NoArgsConstructor
    public static class RegisterRequest {
        @NotBlank
        @Size(max = 100)
        private String name;
        @NotBlank
        @Email
        @Size(max = 254)
        private String email;
        @NotBlank
        @Size(min = 8, max = 72)
        private String password;
        private com.aicareerforge.model.User.Role role;
    }

    @Data
    @Builder
    @AllArgsConstructor
    @NoArgsConstructor
    public static class AuthResponse {
        private String token;
        private String userId;
        private String name;
        private String email;
        private com.aicareerforge.model.User.Role role;
        private boolean needsOnboarding;
    }
}
