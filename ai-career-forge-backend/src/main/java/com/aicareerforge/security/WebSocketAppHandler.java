package com.aicareerforge.security;

import com.aicareerforge.model.User;
import com.aicareerforge.repository.UserRepository;
import com.aicareerforge.repository.UserProfileRepository;
import com.aicareerforge.service.PushNotificationService;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.io.IOException;
import java.net.URI;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Component
public class WebSocketAppHandler extends TextWebSocketHandler {

    private final JwtService jwtService;
    private final UserRepository userRepository;
    private final UserProfileRepository userProfileRepository;
    private final ObjectMapper objectMapper;
    private final PushNotificationService pushNotificationService;

    // Maps User ID to their active WebSocket sessions
    private final Map<String, List<WebSocketSession>> userSessions = new ConcurrentHashMap<>();

    // Cache to maintain the latest active preparation status for recovery
    private final Map<String, Map<String, Object>> activePrepStatuses = new ConcurrentHashMap<>();

    public WebSocketAppHandler(JwtService jwtService, UserRepository userRepository, UserProfileRepository userProfileRepository, ObjectMapper objectMapper, PushNotificationService pushNotificationService) {
        this.jwtService = jwtService;
        this.userRepository = userRepository;
        this.userProfileRepository = userProfileRepository;
        this.objectMapper = objectMapper;
        this.pushNotificationService = pushNotificationService;
    }

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        URI uri = session.getUri();
        String token = extractToken(uri);

        if (token == null) {
            log.warn("WebSocket connection attempt rejected: missing token");
            session.close(CloseStatus.POLICY_VIOLATION);
            return;
        }

        try {
            String email = jwtService.extractUsername(token);
            User user = userRepository.findByEmail(email).orElse(null);

            if (user == null || !jwtService.isTokenValid(token, user)) {
                log.warn("WebSocket connection attempt rejected: invalid token for email {}", email);
                session.close(CloseStatus.POLICY_VIOLATION);
                return;
            }

            String userId = user.getId();
            // Store userId in session attributes so we can clean up easily on close
            session.getAttributes().put("userId", userId);

            userSessions.computeIfAbsent(userId, k -> Collections.synchronizedList(new ArrayList<>())).add(session);
            log.info("WebSocket connection established for user: {} (Session ID: {})", userId, session.getId());

            // Send initial connection confirmation along with currently online users
            List<String> onlineUserIds = new ArrayList<>();
            userSessions.forEach((uId, sessions) -> {
                if (!sessions.isEmpty() && getShowOnlineStatus(uId)) {
                    onlineUserIds.add(uId);
                }
            });

            sendNotificationToSession(session, Map.of(
                    "type", "SYSTEM",
                    "title", "Connected",
                    "message", "Zenith Live Link Established.",
                    "timestamp", java.time.Instant.now().toString(),
                    "data", Map.of("onlineUserIds", onlineUserIds)
            ));

            // Resend active preparation status to the newly connected session if exists
            Map<String, Object> activePrep = activePrepStatuses.get(userId);
            if (activePrep != null) {
                log.info("Replaying active prep status for user: {} on connection established", userId);
                sendNotificationToSession(session, activePrep);
            }

            // Broadcast presence
            if (getShowOnlineStatus(userId)) {
                broadcastPresence(userId, "ONLINE");
            }

        } catch (Exception e) {
            log.error("Error establishing WebSocket session: {}", e.getMessage());
            session.close(CloseStatus.SERVER_ERROR);
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) throws Exception {
        String userId = (String) session.getAttributes().get("userId");
        if (userId != null) {
            List<WebSocketSession> sessions = userSessions.get(userId);
            if (sessions != null) {
                sessions.remove(session);
                if (sessions.isEmpty()) {
                    userSessions.remove(userId);
                    broadcastPresence(userId, "OFFLINE");
                    try {
                        userProfileRepository.findByUserId(userId).ifPresent(profile -> {
                            profile.setLastOnline(java.time.Instant.now());
                            userProfileRepository.save(profile);
                        });
                    } catch (Exception e) {
                        log.error("Failed to update lastOnline status for user ID: {}, error: {}", userId, e.getMessage());
                    }
                }
            }
            log.info("WebSocket connection closed for user: {} (Session ID: {})", userId, session.getId());
        }
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        String senderId = (String) session.getAttributes().get("userId");
        if (senderId == null) return;

        try {
            Map<String, Object> payload = objectMapper.readValue(message.getPayload(), Map.class);
            String type = (String) payload.get("type");

            if ("TYPING".equals(type)) {
                Map<String, Object> data = (Map<String, Object>) payload.get("data");
                if (data != null) {
                    String receiverId = (String) data.get("receiverId");
                    Boolean isTyping = (Boolean) data.get("isTyping");
                    if (receiverId != null && isTyping != null) {
                        sendNotification(receiverId, "TYPING", "Typing", isTyping ? "typing" : "stopped", Map.of(
                                "senderId", senderId,
                                "isTyping", isTyping
                        ));
                    }
                }
            }
        } catch (Exception e) {
            log.error("Error processing incoming WebSocket message: {}", e.getMessage());
        }
    }

    public void sendNotification(String userId, String type, String title, String message, Object data) {
        String displayMessage = "MESSAGE".equals(type) ? formatNotificationMessage(message) : message;

        if ("PREP_STATUS".equals(type)) {
            if (data instanceof Map) {
                Map<String, Object> dataMap = (Map<String, Object>) data;
                String step = (String) dataMap.get("step");
                if ("COMPLETED".equals(step) || "FAILED".equals(step)) {
                    activePrepStatuses.remove(userId);
                } else {
                    activePrepStatuses.put(userId, Map.of(
                            "type", type,
                            "title", title,
                            "message", message,
                            "timestamp", java.time.Instant.now().toString(),
                            "data", data != null ? data : Map.of()
                    ));
                }
            }
        }

        List<WebSocketSession> sessions = userSessions.get(userId);
        if (sessions == null || sessions.isEmpty()) {
            log.debug("No active WebSocket sessions for user ID: {}, triggering background push", userId);
            try {
                pushNotificationService.sendPushNotification(userId, title, displayMessage, data);
            } catch (Exception e) {
                log.error("Failed to send fallback device level push notification for user {}: {}", userId, e.getMessage());
            }
            return;
        }

        Map<String, Object> payload = Map.of(
                "type", type,
                "title", title,
                "message", displayMessage,
                "timestamp", java.time.Instant.now().toString(),
                "data", data != null ? data : Map.of()
        );

        log.info("Pushing notification of type {} to user {}", type, userId);
        synchronized (sessions) {
            List<WebSocketSession> closedSessions = new ArrayList<>();
            for (WebSocketSession session : sessions) {
                if (session.isOpen()) {
                    try {
                        sendNotificationToSession(session, payload);
                    } catch (IOException e) {
                        log.error("Failed to send socket message, marking session for removal: {}", session.getId());
                        closedSessions.add(session);
                    }
                } else {
                    closedSessions.add(session);
                }
            }
            sessions.removeAll(closedSessions);
        }
    }

    public void broadcastNotification(String type, String title, String message, Object data) {
        log.info("Broadcasting notification of type {} to all connected users", type);
        Map<String, Object> payload = Map.of(
                "type", type,
                "title", title,
                "message", message,
                "timestamp", java.time.Instant.now().toString(),
                "data", data != null ? data : Map.of()
        );

        userSessions.forEach((userId, sessions) -> {
            synchronized (sessions) {
                List<WebSocketSession> closedSessions = new ArrayList<>();
                for (WebSocketSession session : sessions) {
                    if (session.isOpen()) {
                        try {
                            sendNotificationToSession(session, payload);
                        } catch (IOException e) {
                            closedSessions.add(session);
                        }
                    } else {
                        closedSessions.add(session);
                    }
                }
                sessions.removeAll(closedSessions);
            }
        });
    }

    private void sendNotificationToSession(WebSocketSession session, Map<String, Object> payload) throws IOException {
        String json = objectMapper.writeValueAsString(payload);
        session.sendMessage(new TextMessage(json));
    }

    private String extractToken(URI uri) {
        if (uri == null || uri.getQuery() == null) return null;
        String query = uri.getQuery();
        for (String param : query.split("&")) {
            String[] keyValue = param.split("=");
            if (keyValue.length > 1 && "token".equals(keyValue[0])) {
                return keyValue[1];
            }
        }
        return null;
    }

    public void broadcastPresence(String userId, String status) {
        broadcastNotification("PRESENCE", userId, status, Map.of("userId", userId, "status", status));
    }

    public void handlePresenceToggle(String userId, boolean showOnline) {
        List<WebSocketSession> sessions = userSessions.get(userId);
        if (sessions != null && !sessions.isEmpty()) {
            if (showOnline) {
                broadcastPresence(userId, "ONLINE");
            } else {
                broadcastPresence(userId, "OFFLINE");
            }
        }
    }


    public boolean isUserOnline(String userId) {
        List<WebSocketSession> sessions = userSessions.get(userId);
        if (sessions == null || sessions.isEmpty()) {
            return false;
        }
        return getShowOnlineStatus(userId);
    }

    public List<String> getOnlineUserIds() {
        List<String> onlineUserIds = new ArrayList<>();
        userSessions.forEach((uId, sessions) -> {
            if (!sessions.isEmpty() && getShowOnlineStatus(uId)) {
                onlineUserIds.add(uId);
            }
        });
        return onlineUserIds;
    }

    private boolean getShowOnlineStatus(String userId) {
        try {
            return userProfileRepository.findByUserId(userId)
                    .map(profile -> profile.getSettings() == null || profile.getSettings().isShowOnlineStatus())
                    .orElse(true);
        } catch (Exception e) {
            return true;
        }
    }

    private String formatNotificationMessage(String message) {
        if (message == null) return "";
        String trimmed = message.trim();
        if (trimmed.startsWith("{\"encrypted\":true")) {
            return "🔒 [Encrypted Message]";
        }
        if (trimmed.startsWith("[GIF]")) {
            return "[GIF]";
        }
        if (trimmed.startsWith("[STICKER]")) {
            return "[Sticker]";
        }
        if (trimmed.startsWith("{\"type\":\"POST_SHARE\"")) {
            return "Sent a post";
        }
        if (trimmed.startsWith("{\"type\":\"REPLY\"")) {
            try {
                // Quick parse reply text snippet
                int textIdx = trimmed.indexOf("\"text\":\"");
                if (textIdx != -1) {
                    int start = textIdx + 8;
                    int end = trimmed.indexOf("\"", start);
                    if (end != -1) {
                        return trimmed.substring(start, end);
                    }
                }
            } catch (Exception e) {
                // ignore
            }
            return "Replied to a message";
        }
        return message;
    }
}
