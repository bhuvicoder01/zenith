package com.aicareerforge.controller;

import com.aicareerforge.model.ChatMessage;
import com.aicareerforge.model.ChatSession;
import com.aicareerforge.model.User;
import com.aicareerforge.service.AssistantService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/v1/assistant")
@RequiredArgsConstructor
public class AssistantController {

    private final AssistantService assistantService;

    // Only the server-authenticated principal can select a conversation owner.
    // Client headers, IP addresses, and request-body user IDs are not identities.
    private String getUserId(User user) {
        if (user == null || user.getId() == null || user.getId().isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication required");
        }
        return user.getId();
    }

    @GetMapping("/sessions")
    public ResponseEntity<List<ChatSession>> getSessions(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(assistantService.getUserSessions(getUserId(user)));
    }

    @PostMapping("/sessions")
    public ResponseEntity<ChatSession> createSession(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody CreateSessionRequest body) {
        return ResponseEntity.ok(assistantService.createSession(getUserId(user), body.title()));
    }

    @GetMapping("/sessions/{sessionId}/messages")
    public ResponseEntity<List<ChatMessage>> getMessages(
            @AuthenticationPrincipal User user,
            @PathVariable String sessionId) {
        return ResponseEntity.ok(assistantService.getSessionMessages(getUserId(user), sessionId));
    }

    @PostMapping("/chat")
    public ResponseEntity<ChatMessage> sendMessage(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody ChatRequest body) {
        return ResponseEntity.ok(assistantService.sendMessage(
                getUserId(user), 
                body.sessionId(),
                body.message()
        ));
    }

    public record CreateSessionRequest(@Size(max = 120) String title) {}

    public record ChatRequest(
            @Size(max = 128) String sessionId,
            @NotBlank @Size(max = 8000) String message) {}
}
