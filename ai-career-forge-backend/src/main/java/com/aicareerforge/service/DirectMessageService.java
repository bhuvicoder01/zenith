package com.aicareerforge.service;

import com.aicareerforge.dto.ConversationDTO;
import com.aicareerforge.dto.PublicProfileDTO;
import com.aicareerforge.model.DirectMessage;
import com.aicareerforge.model.User;
import com.aicareerforge.repository.DirectMessageRepository;
import com.aicareerforge.repository.UserRepository;
import com.aicareerforge.security.WebSocketAppHandler;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class DirectMessageService {

    private final DirectMessageRepository directMessageRepository;
    private final UserRepository userRepository;
    private final UserProfileService userProfileService;
    private final WebSocketAppHandler webSocketAppHandler;

    public DirectMessage sendMessage(String senderId, String receiverId, String content) {
        if (senderId == null || receiverId == null || content == null || content.trim().isEmpty()) {
            throw new IllegalArgumentException("Invalid message parameters");
        }

        // Verify receiver exists
        if (!userRepository.existsById(receiverId)) {
            throw new IllegalArgumentException("Receiver does not exist");
        }

        DirectMessage message = DirectMessage.builder()
                .senderId(senderId)
                .receiverId(receiverId)
                .content(content)
                .timestamp(Instant.now())
                .isRead(false)
                .build();

        DirectMessage savedMessage = directMessageRepository.save(message);
        log.info("Direct message sent from {} to {}", senderId, receiverId);

        // Push real-time event to receiver and sender (for multi-device sync)
        String senderName = getUserFullName(senderId);
        try {
            // Push to receiver
            webSocketAppHandler.sendNotification(receiverId, "MESSAGE", senderName, content, savedMessage);
            // Push to sender
            webSocketAppHandler.sendNotification(senderId, "MESSAGE", senderName, content, savedMessage);
        } catch (Exception e) {
            log.error("Failed to deliver real-time message notification: {}", e.getMessage());
        }

        return savedMessage;
    }

    public List<DirectMessage> getChatHistory(String userId, String otherUserId) {
        Sort sort = Sort.by(Sort.Direction.ASC, "timestamp");
        List<DirectMessage> history = directMessageRepository.findChatHistory(userId, otherUserId, sort);
        
        // Auto-mark received messages as read
        markChatAsRead(userId, otherUserId);
        
        return history;
    }

    public void markChatAsRead(String receiverId, String senderId) {
        List<DirectMessage> unread = directMessageRepository.findUnreadMessagesForChat(receiverId, senderId, false);
        if (!unread.isEmpty()) {
            unread.forEach(m -> m.setRead(true));
            directMessageRepository.saveAll(unread);
            log.info("Marked {} messages from {} to {} as read", unread.size(), senderId, receiverId);
            
            try {
                webSocketAppHandler.sendNotification(
                        senderId,
                        "READ",
                        "Messages Read",
                        "Receiver read messages",
                        java.util.Map.of("readerId", receiverId)
                );
            } catch (Exception e) {
                log.error("Failed to push read receipt WS notification: {}", e.getMessage());
            }
        }
    }

    public List<ConversationDTO> getActiveConversations(String userId) {
        Sort sort = Sort.by(Sort.Direction.DESC, "timestamp");
        List<DirectMessage> messages = directMessageRepository.findActiveMessagesForUser(userId, sort);
        
        List<String> orderedOtherUserIds = new ArrayList<>();
        List<DirectMessage> lastMessages = new ArrayList<>();
        
        for (DirectMessage msg : messages) {
            String otherId = msg.getSenderId().equals(userId) ? msg.getReceiverId() : msg.getSenderId();
            if (!orderedOtherUserIds.contains(otherId)) {
                orderedOtherUserIds.add(otherId);
                lastMessages.add(msg);
            }
        }
        
        List<ConversationDTO> conversations = new ArrayList<>();
        for (int i = 0; i < orderedOtherUserIds.size(); i++) {
            String otherId = orderedOtherUserIds.get(i);
            DirectMessage lastMsg = lastMessages.get(i);
            
            PublicProfileDTO otherUserProfile = getPublicProfileOrFallback(otherId);
            long unreadCount = directMessageRepository.findUnreadMessagesForChat(userId, otherId, false).size();
            
            conversations.add(ConversationDTO.builder()
                    .otherUser(otherUserProfile)
                    .lastMessage(lastMsg)
                    .unreadCount(unreadCount)
                    .build());
        }
        
        return conversations;
    }

    public long getOverallUnreadCount(String userId) {
        return directMessageRepository.countByReceiverIdAndIsReadAndDeletedByReceiverFalse(userId, false);
    }

    public void clearConversation(String userId, String otherUserId) {
        Sort sort = Sort.by(Sort.Direction.ASC, "timestamp");
        List<DirectMessage> history = directMessageRepository.findChatHistory(userId, otherUserId, sort);
        if (!history.isEmpty()) {
            for (DirectMessage msg : history) {
                if (msg.getSenderId().equals(userId)) {
                    msg.setDeletedBySender(true);
                }
                if (msg.getReceiverId().equals(userId)) {
                    msg.setDeletedByReceiver(true);
                }
            }
            directMessageRepository.saveAll(history);
            log.info("Cleared conversation for user {} with other user {}", userId, otherUserId);
        }
    }

    public List<String> getOnlineUsers() {
        return webSocketAppHandler.getOnlineUserIds();
    }


    private String getUserFullName(String userId) {
        try {
            PublicProfileDTO profile = userProfileService.getPublicProfile(userId);
            if (profile != null && profile.getFullName() != null) {
                return profile.getFullName();
            }
        } catch (Exception e) {
            // ignore
        }
        Optional<User> userOpt = userRepository.findById(userId);
        return userOpt.map(user -> user.getName() != null ? user.getName() : "Zenith User").orElse("Zenith User");
    }

    private PublicProfileDTO getPublicProfileOrFallback(String otherUserId) {
        try {
            return userProfileService.getPublicProfile(otherUserId);
        } catch (IllegalArgumentException e) {
            Optional<User> userOpt = userRepository.findById(otherUserId);
            if (userOpt.isPresent()) {
                User user = userOpt.get();
                return PublicProfileDTO.builder()
                        .userId(otherUserId)
                        .fullName(user.getName() != null ? user.getName() : "Zenith User")
                        .headline("Zenith Operative")
                        .skills(new ArrayList<>())
                        .build();
            }
            return PublicProfileDTO.builder()
                    .userId(otherUserId)
                    .fullName("Unknown Operative")
                    .headline("Zenith Operative")
                    .build();
        }
    }
}
