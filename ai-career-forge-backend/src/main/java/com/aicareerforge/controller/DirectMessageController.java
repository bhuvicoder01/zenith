package com.aicareerforge.controller;

import com.aicareerforge.dto.ConversationDTO;
import com.aicareerforge.model.DirectMessage;
import com.aicareerforge.model.User;
import com.aicareerforge.service.DirectMessageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/v1/messages")
@RequiredArgsConstructor
public class DirectMessageController {

    private final DirectMessageService directMessageService;

    @PostMapping("/send")
    public ResponseEntity<DirectMessage> sendMessage(
            @AuthenticationPrincipal User user,
            @RequestBody Map<String, String> body) {
        String receiverId = body.get("receiverId");
        String content = body.get("content");
        
        DirectMessage message = directMessageService.sendMessage(user.getId(), receiverId, content);
        return ResponseEntity.ok(message);
    }

    @GetMapping("/history/{otherUserId}")
    public ResponseEntity<List<DirectMessage>> getChatHistory(
            @AuthenticationPrincipal User user,
            @PathVariable String otherUserId,
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "30") int size) {
        List<DirectMessage> history = directMessageService.getChatHistory(user.getId(), otherUserId, page, size);
        return ResponseEntity.ok(history);
    }

    @PostMapping("/read/{senderId}")
    public ResponseEntity<Void> markChatAsRead(
            @AuthenticationPrincipal User user,
            @PathVariable String senderId) {
        directMessageService.markChatAsRead(user.getId(), senderId);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/read-multiple")
    public ResponseEntity<Void> markMessagesAsRead(
            @AuthenticationPrincipal User user,
            @RequestBody Map<String, List<String>> body) {
        List<String> messageIds = body.get("messageIds");
        directMessageService.markMessagesAsRead(user.getId(), messageIds);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/conversations")
    public ResponseEntity<List<ConversationDTO>> getConversations(
            @AuthenticationPrincipal User user) {
        List<ConversationDTO> conversations = directMessageService.getActiveConversations(user.getId());
        return ResponseEntity.ok(conversations);
    }

    @GetMapping("/unread-count")
    public ResponseEntity<Map<String, Long>> getUnreadCount(
            @AuthenticationPrincipal User user) {
        long count = directMessageService.getOverallUnreadCount(user.getId());
        return ResponseEntity.ok(Map.of("unreadCount", count));
    }

    @DeleteMapping("/clear/{otherUserId}")
    public ResponseEntity<Void> clearConversation(
            @AuthenticationPrincipal User user,
            @PathVariable String otherUserId) {
        directMessageService.clearConversation(user.getId(), otherUserId);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/presence")
    public ResponseEntity<List<String>> getOnlineUsers() {
        return ResponseEntity.ok(directMessageService.getOnlineUsers());
    }
}

