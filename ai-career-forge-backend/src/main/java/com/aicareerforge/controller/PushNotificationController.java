package com.aicareerforge.controller;

import com.aicareerforge.model.User;
import com.aicareerforge.service.PushNotificationService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/v1/notifications")
@RequiredArgsConstructor
public class PushNotificationController {

    private final PushNotificationService pushNotificationService;

    @GetMapping("/vapid-public-key")
    public ResponseEntity<Map<String, String>> getVapidPublicKey() {
        String key = pushNotificationService.getPublicKey();
        if (key == null) {
            return ResponseEntity.internalServerError().build();
        }
        return ResponseEntity.ok(Map.of("publicKey", key));
    }

    @PostMapping("/subscribe")
    public ResponseEntity<Map<String, String>> subscribe(
            @AuthenticationPrincipal User user,
            @RequestBody SubscriptionRequest request) {
        
        if (request == null || request.getEndpoint() == null || request.getKeys() == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Invalid subscription payload"));
        }

        try {
            pushNotificationService.subscribe(
                    user.getId(),
                    request.getEndpoint(),
                    request.getKeys().getP256dh(),
                    request.getKeys().getAuth()
            );
            return ResponseEntity.ok(Map.of("status", "SUCCESS"));
        } catch (Exception e) {
            log.error("Subscription registration failed for user ID {}: {}", user.getId(), e.getMessage());
            return ResponseEntity.internalServerError().body(Map.of("message", "Subscription failed: " + e.getMessage()));
        }
    }

    @PostMapping("/unsubscribe")
    public ResponseEntity<Map<String, String>> unsubscribe(
            @RequestBody UnsubscribeRequest request) {
        
        if (request == null || request.getEndpoint() == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Invalid unsubscribe payload"));
        }

        try {
            pushNotificationService.unsubscribe(request.getEndpoint());
            return ResponseEntity.ok(Map.of("status", "SUCCESS"));
        } catch (Exception e) {
            log.error("Deregistration failed for endpoint {}: {}", request.getEndpoint(), e.getMessage());
            return ResponseEntity.internalServerError().body(Map.of("message", "Unsubscribe failed: " + e.getMessage()));
        }
    }

    @Data
    public static class SubscriptionRequest {
        private String endpoint;
        private Keys keys;

        @Data
        public static class Keys {
            private String p256dh;
            private String auth;
        }
    }

    @Data
    public static class UnsubscribeRequest {
        private String endpoint;
    }
}
