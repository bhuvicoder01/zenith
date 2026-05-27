package com.aicareerforge.service;

import com.aicareerforge.dto.ConnectionDTO;
import com.aicareerforge.dto.ConnectionRequestDTO;
import com.aicareerforge.dto.ConnectionStatusDTO;
import com.aicareerforge.dto.PublicProfileDTO;
import com.aicareerforge.model.Connection;
import com.aicareerforge.model.User;
import com.aicareerforge.model.UserProfile;
import com.aicareerforge.repository.ConnectionRepository;
import com.aicareerforge.repository.UserProfileRepository;
import com.aicareerforge.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class ConnectionService {

    private final ConnectionRepository connectionRepository;
    private final UserProfileRepository userProfileRepository;
    private final UserRepository userRepository;
    private final UserProfileService userProfileService;
    private final com.aicareerforge.security.WebSocketNotificationHandler webSocketNotificationHandler;

    public Connection sendRequest(String requesterId, String receiverId) {
        if (requesterId == null || receiverId == null) {
            throw new IllegalArgumentException("Ids cannot be null");
        }
        if (requesterId.equals(receiverId)) {
            throw new IllegalArgumentException("You cannot connect with yourself");
        }

        // Verify receiver exists
        if (!userRepository.existsById(receiverId)) {
            throw new IllegalArgumentException("Target user does not exist");
        }

        Optional<Connection> existingOpt = connectionRepository.findConnectionBetween(requesterId, receiverId);
        if (existingOpt.isPresent()) {
            Connection existing = existingOpt.get();
            if (existing.getStatus() == Connection.Status.ACCEPTED) {
                throw new IllegalArgumentException("Already connected");
            } else {
                throw new IllegalArgumentException("Connection request is already pending");
            }
        }

        Connection connection = Connection.builder()
                .requesterId(requesterId)
                .receiverId(receiverId)
                .status(Connection.Status.PENDING)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();

        log.info("Sending connection request from {} to {}", requesterId, receiverId);
        Connection saved = connectionRepository.save(connection);

        // Dispatch live WS notification
        try {
            PublicProfileDTO requesterProfile = getPublicProfileOrFallback(requesterId);
            webSocketNotificationHandler.sendNotification(
                    receiverId,
                    "CONNECTION_REQUEST",
                    "New Invitation",
                    requesterProfile.getFullName() + " wants to connect with you!",
                    java.util.Map.of("connectionId", saved.getId(), "requester", requesterProfile)
            );
        } catch (Exception e) {
            log.error("Failed to push connection request WS notification: {}", e.getMessage());
        }

        return saved;
    }

    public Connection acceptRequest(String userId, String connectionId) {
        Connection connection = connectionRepository.findById(connectionId)
                .orElseThrow(() -> new IllegalArgumentException("Connection request not found"));

        if (!connection.getReceiverId().equals(userId)) {
            throw new IllegalArgumentException("You are not authorized to accept this request");
        }

        if (connection.getStatus() != Connection.Status.PENDING) {
            throw new IllegalArgumentException("Connection request is not pending");
        }

        connection.setStatus(Connection.Status.ACCEPTED);
        connection.setUpdatedAt(Instant.now());

        log.info("User {} accepted connection request {} from {}", userId, connectionId, connection.getRequesterId());
        Connection saved = connectionRepository.save(connection);

        // Dispatch live WS notification
        try {
            PublicProfileDTO receiverProfile = getPublicProfileOrFallback(userId);
            webSocketNotificationHandler.sendNotification(
                    connection.getRequesterId(),
                    "CONNECTION_ACCEPTED",
                    "Invitation Accepted",
                    receiverProfile.getFullName() + " accepted your connection request!",
                    java.util.Map.of("connectionId", saved.getId(), "user", receiverProfile)
            );
        } catch (Exception e) {
            log.error("Failed to push connection accept WS notification: {}", e.getMessage());
        }

        return saved;
    }

    public void rejectRequest(String userId, String connectionId) {
        Connection connection = connectionRepository.findById(connectionId)
                .orElseThrow(() -> new IllegalArgumentException("Connection request not found"));

        if (!connection.getReceiverId().equals(userId)) {
            throw new IllegalArgumentException("You are not authorized to reject this request");
        }

        if (connection.getStatus() != Connection.Status.PENDING) {
            throw new IllegalArgumentException("Connection request is not pending");
        }

        log.info("User {} rejected connection request {} from {}", userId, connectionId, connection.getRequesterId());
        connectionRepository.delete(connection);
    }

    public void removeConnection(String userId, String connectionId) {
        Connection connection = connectionRepository.findById(connectionId)
                .orElseThrow(() -> new IllegalArgumentException("Connection not found"));

        if (!connection.getRequesterId().equals(userId) && !connection.getReceiverId().equals(userId)) {
            throw new IllegalArgumentException("You are not authorized to remove this connection");
        }

        log.info("User {} removed connection {}", userId, connectionId);
        connectionRepository.delete(connection);
    }

    public ConnectionStatusDTO getConnectionStatus(String userId, String targetUserId) {
        Optional<Connection> connOpt = connectionRepository.findConnectionBetween(userId, targetUserId);
        if (connOpt.isEmpty()) {
            return ConnectionStatusDTO.builder()
                    .status("NONE")
                    .connectionId(null)
                    .build();
        }

        Connection connection = connOpt.get();
        if (connection.getStatus() == Connection.Status.ACCEPTED) {
            return ConnectionStatusDTO.builder()
                    .status("CONNECTED")
                    .connectionId(connection.getId())
                    .build();
        }

        // It is pending, check direction
        if (connection.getRequesterId().equals(userId)) {
            return ConnectionStatusDTO.builder()
                    .status("PENDING_SENT")
                    .connectionId(connection.getId())
                    .build();
        } else {
            return ConnectionStatusDTO.builder()
                    .status("PENDING_RECEIVED")
                    .connectionId(connection.getId())
                    .build();
        }
    }

    public List<ConnectionRequestDTO> getPendingRequests(String userId) {
        List<Connection> pending = connectionRepository.findByReceiverIdAndStatus(userId, Connection.Status.PENDING);
        List<ConnectionRequestDTO> dtoList = new ArrayList<>();

        for (Connection c : pending) {
            String requesterId = c.getRequesterId();
            PublicProfileDTO profileDTO = getPublicProfileOrFallback(requesterId);
            
            dtoList.add(ConnectionRequestDTO.builder()
                    .id(c.getId())
                    .user(profileDTO)
                    .createdAt(c.getCreatedAt())
                    .build());
        }

        return dtoList;
    }

    public List<ConnectionRequestDTO> getSentRequests(String userId) {
        List<Connection> pending = connectionRepository.findByRequesterIdAndStatus(userId, Connection.Status.PENDING);
        List<ConnectionRequestDTO> dtoList = new ArrayList<>();

        for (Connection c : pending) {
            String receiverId = c.getReceiverId();
            PublicProfileDTO profileDTO = getPublicProfileOrFallback(receiverId);
            
            dtoList.add(ConnectionRequestDTO.builder()
                    .id(c.getId())
                    .user(profileDTO)
                    .createdAt(c.getCreatedAt())
                    .build());
        }

        return dtoList;
    }

    public List<ConnectionDTO> getActiveConnections(String userId) {
        List<Connection> accepted = connectionRepository.findAcceptedConnections(userId);
        List<ConnectionDTO> dtoList = new ArrayList<>();

        for (Connection c : accepted) {
            String otherUserId = c.getRequesterId().equals(userId) ? c.getReceiverId() : c.getRequesterId();
            PublicProfileDTO profileDTO = getPublicProfileOrFallback(otherUserId);

            dtoList.add(ConnectionDTO.builder()
                    .id(c.getId())
                    .user(profileDTO)
                    .createdAt(c.getCreatedAt())
                    .build());
        }

        return dtoList;
    }

    private PublicProfileDTO getPublicProfileOrFallback(String userId) {
        try {
            return userProfileService.getPublicProfile(userId);
        } catch (IllegalArgumentException e) {
            // Profile might not exist yet (e.g. newly registered user who hasn't onboarded)
            // We return a fallback DTO with basic details if user exists in UserRepository
            Optional<User> userOpt = userRepository.findById(userId);
            if (userOpt.isPresent()) {
                User user = userOpt.get();
                return PublicProfileDTO.builder()
                        .userId(userId)
                        .fullName(user.getName() != null ? user.getName() : "Zenith User")
                        .headline("Zenith Member")
                        .bio("")
                        .skills(new ArrayList<>())
                        .experiences(new ArrayList<>())
                        .academicProjects(new ArrayList<>())
                        .certifications(new ArrayList<>())
                        .internships(new ArrayList<>())
                        .build();
            }
            return PublicProfileDTO.builder()
                    .userId(userId)
                    .fullName("Unknown User")
                    .headline("Zenith Member")
                    .build();
        }
    }
}
