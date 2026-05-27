package com.aicareerforge.controller;

import com.aicareerforge.dto.ConnectionDTO;
import com.aicareerforge.dto.ConnectionRequestDTO;
import com.aicareerforge.dto.ConnectionStatusDTO;
import com.aicareerforge.model.Connection;
import com.aicareerforge.model.User;
import com.aicareerforge.service.ConnectionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/connections")
@RequiredArgsConstructor
public class ConnectionController {

    private final ConnectionService connectionService;

    @PostMapping("/request/{receiverId}")
    public ResponseEntity<Connection> sendRequest(
            @AuthenticationPrincipal User user,
            @PathVariable String receiverId) {
        try {
            Connection connection = connectionService.sendRequest(user.getId(), receiverId);
            return ResponseEntity.ok(connection);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @PostMapping("/accept/{connectionId}")
    public ResponseEntity<Connection> acceptRequest(
            @AuthenticationPrincipal User user,
            @PathVariable String connectionId) {
        try {
            Connection connection = connectionService.acceptRequest(user.getId(), connectionId);
            return ResponseEntity.ok(connection);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @PostMapping("/reject/{connectionId}")
    public ResponseEntity<Void> rejectRequest(
            @AuthenticationPrincipal User user,
            @PathVariable String connectionId) {
        try {
            connectionService.rejectRequest(user.getId(), connectionId);
            return ResponseEntity.noContent().build();
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @DeleteMapping("/{connectionId}")
    public ResponseEntity<Void> removeConnection(
            @AuthenticationPrincipal User user,
            @PathVariable String connectionId) {
        try {
            connectionService.removeConnection(user.getId(), connectionId);
            return ResponseEntity.noContent().build();
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @GetMapping("/status/{userId}")
    public ResponseEntity<ConnectionStatusDTO> getConnectionStatus(
            @AuthenticationPrincipal User user,
            @PathVariable String userId) {
        return ResponseEntity.ok(connectionService.getConnectionStatus(user.getId(), userId));
    }

    @GetMapping("/pending")
    public ResponseEntity<List<ConnectionRequestDTO>> getPendingRequests(
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(connectionService.getPendingRequests(user.getId()));
    }

    @GetMapping("/sent")
    public ResponseEntity<List<ConnectionRequestDTO>> getSentRequests(
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(connectionService.getSentRequests(user.getId()));
    }

    @GetMapping
    public ResponseEntity<List<ConnectionDTO>> getActiveConnections(
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(connectionService.getActiveConnections(user.getId()));
    }
}
