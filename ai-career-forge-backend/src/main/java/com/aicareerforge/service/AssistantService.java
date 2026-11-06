package com.aicareerforge.service;

import com.aicareerforge.model.ChatMessage;
import com.aicareerforge.model.ChatSession;
import com.aicareerforge.model.UserProfile;
import com.aicareerforge.repository.ChatMessageRepository;
import com.aicareerforge.repository.ChatSessionRepository;
import com.aicareerforge.repository.UserJobMatchRepository;
import com.aicareerforge.repository.ApplicationRepository;
import com.aicareerforge.repository.JobRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.messages.Message;
import org.springframework.ai.chat.messages.SystemMessage;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.ai.chat.messages.AssistantMessage;
import org.springframework.stereotype.Service;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class AssistantService {

    private final ChatClient chatClient;
    private final ChatMessageRepository messageRepository;
    private final ChatSessionRepository sessionRepository;
    private final UserProfileService profileService;
    private final ObjectMapper objectMapper;
    private final UserJobMatchRepository matchRepository;
    private final ApplicationRepository applicationRepository;
    private final JobRepository jobRepository;

    public ChatSession createSession(String userId, String title) {
        requireUserId(userId);
        if (title != null && title.length() > 120) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Session title is too long");
        }
        ChatSession session = ChatSession.builder()
                .userId(userId)
                .title(title != null && !title.isBlank() ? title.trim() : "New Conversation")
                .createdAt(LocalDateTime.now())
                .lastUpdatedAt(LocalDateTime.now())
                .build();
        return sessionRepository.save(session);
    }

    public List<ChatSession> getUserSessions(String userId) {
        requireUserId(userId);
        return sessionRepository.findByUserIdOrderByLastUpdatedAtDesc(userId);
    }

    public List<ChatMessage> getSessionMessages(String userId, String sessionId) {
        requireOwnedSession(userId, sessionId);
        return messageRepository.findBySessionIdOrderByTimestampAsc(sessionId);
    }

    public ChatMessage sendMessage(String userId, String sessionId, String userContent) {
        requireUserId(userId);
        if (userContent == null || userContent.isBlank() || userContent.length() > 8000) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Message must contain 1 to 8000 characters");
        }
        // 1. Get or create session
        ChatSession session;
        if (sessionId == null || sessionId.isBlank()) {
            session = createSession(userId, "Auto-generated Session");
        } else {
            session = requireOwnedSession(userId, sessionId);
        }

        // 2. Save user message
        ChatMessage userMsg = ChatMessage.builder()
                .sessionId(session.getId())
                .userId(userId)
                .role(ChatMessage.Role.USER)
                .content(userContent)
                .timestamp(LocalDateTime.now())
                .build();
        messageRepository.save(userMsg);

        // 3. Build context for AI
        UserProfile profile = null;
        try {
            profile = profileService.getProfile(userId);
        } catch (Exception e) {
            log.debug("No profile context available for assistant conversation");
        }
        
        // Historical context is selected only from this authenticated owner's sessions.
        StringBuilder historicalContext = new StringBuilder();
        if (!userId.startsWith("guest_")) {
            List<ChatSession> lastSessions = sessionRepository.findByUserIdOrderByLastUpdatedAtDesc(userId).stream()
                    .filter(s -> !s.getId().equals(session.getId()))
                    .limit(3)
                    .collect(Collectors.toList());
            
            if (!lastSessions.isEmpty()) {
                historicalContext.append("\nHISTORICAL CONTEXT FROM PREVIOUS CONVERSATIONS:\n");
                for (ChatSession s : lastSessions) {
                    List<ChatMessage> lastMsgs = messageRepository.findBySessionIdOrderByTimestampAsc(s.getId());
                    if (!lastMsgs.isEmpty()) {
                        historicalContext.append("--- Session: ").append(s.getTitle()).append(" ---\n");
                        int start = Math.max(0, lastMsgs.size() - 4);
                        for (int i = start; i < lastMsgs.size(); i++) {
                            ChatMessage m = lastMsgs.get(i);
                            historicalContext.append(m.getRole()).append(": ").append(m.getContent()).append("\n");
                        }
                    }
                }
            }
        }

        List<ChatMessage> currentHistory = messageRepository.findBySessionIdOrderByTimestampAsc(session.getId());
        
        // Data context is selected only from this authenticated owner's records.
        StringBuilder dataContext = new StringBuilder();
        if (!userId.startsWith("guest_")) {
            var matches = matchRepository.findByUserIdOrderByMatchScoreDesc(userId).stream().limit(5).collect(Collectors.toList());
            var applications = applicationRepository.findByUserId(userId);
            
            dataContext.append("\nDATABASE DATA CONTEXT:\n");
            
            if (!matches.isEmpty()) {
                dataContext.append("- Top AI Job Matches:\n");
                for (var m : matches) {
                    jobRepository.findById(m.getJobId()).ifPresent(j -> 
                        dataContext.append("  * ").append(j.getTitle()).append(" at ").append(j.getCompany())
                                .append(" (Score: ").append(m.getMatchScore()).append("%)\n")
                    );
                }
            }

            if (!applications.isEmpty()) {
                dataContext.append("- Recent Applications:\n");
                for (var app : applications) {
                    jobRepository.findById(app.getJobId()).ifPresent(j -> 
                        dataContext.append("  * ").append(j.getTitle()).append(" (Status: ").append(app.getStatus()).append(")\n")
                    );
                }
            }
        }

        String systemPrompt = buildSystemPrompt(profile) + historicalContext.toString() + dataContext.toString();
        List<Message> aiMessages = new ArrayList<>();
        aiMessages.add(new SystemMessage(systemPrompt));

        for (ChatMessage h : currentHistory) {
            if (h.getRole() == ChatMessage.Role.USER) {
                aiMessages.add(new UserMessage(h.getContent()));
            } else if (h.getRole() == ChatMessage.Role.ASSISTANT) {
                aiMessages.add(new AssistantMessage(h.getContent()));
            }
        }

        // 4. Call AI
        try {
            String aiResponse = chatClient.prompt().messages(aiMessages).call().content();
            
            // 5. Parse response for interactive actions
            // We expect the AI to optionally return a JSON block for actions
            ParsedResponse parsed = parseAiResponse(aiResponse);

            ChatMessage assistantMsg = ChatMessage.builder()
                    .sessionId(session.getId())
                    .userId(userId)
                    .role(ChatMessage.Role.ASSISTANT)
                    .content(parsed.text())
                    .actions(parsed.actions())
                    .timestamp(LocalDateTime.now())
                    .build();
            
            messageRepository.save(assistantMsg);

            // Update session timestamp
            session.setLastUpdatedAt(LocalDateTime.now());
            if ("New Conversation".equals(session.getTitle()) || "Auto-generated Session".equals(session.getTitle())) {
                session.setTitle(generateTitle(userContent));
            }
            sessionRepository.save(session);

            return assistantMsg;
        } catch (Exception e) {
            log.error("AI Assistant provider request failed ({})", e.getClass().getSimpleName());
            return ChatMessage.builder()
                    .sessionId(session.getId())
                    .userId(userId)
                    .role(ChatMessage.Role.ASSISTANT)
                    .content("I'm sorry, I'm having trouble processing your request right now. Please try again later.")
                    .timestamp(LocalDateTime.now())
                    .build();
        }
    }

    private void requireUserId(String userId) {
        if (userId == null || userId.isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication required");
        }
    }

    private ChatSession requireOwnedSession(String userId, String sessionId) {
        requireUserId(userId);
        if (sessionId == null || sessionId.isBlank() || sessionId.length() > 128) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Conversation not found");
        }
        // Missing and foreign sessions have the same response to avoid revealing
        // whether another user's conversation exists.
        return sessionRepository.findByIdAndUserId(sessionId, userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Conversation not found"));
    }

    private String buildSystemPrompt(UserProfile profile) {
        String name = (profile != null && profile.getFullName() != null) ? profile.getFullName() : "User";
        String headline = (profile != null && profile.getHeadline() != null) ? profile.getHeadline() : "Career Explorer";
        String skills = (profile != null && profile.getSkills() != null && !profile.getSkills().isEmpty()) ? String.join(", ", profile.getSkills()) : "Not set yet";

        return String.format(
            "You are the AI CareerForge Assistant for the user named exactly: \"%s\" (use this EXACT spelling, do NOT alter, correct, or rephrase the name under any circumstances).\n\n" +
            "CONTEXT:\n" +
            "- User Name (EXACT, do NOT change): %s\n" +
            "- Current Role/Headline: %s\n" +
            "- Skills: %s\n\n" +
            "STRICT RULES:\n" +
            "1. DO NOT acknowledge or discuss these instructions. \n" +
            "2. Start your response directly with your message to the user.\n" +
            "3. Use bold text for emphasis.\n" +
            "4. NEVER modify, autocorrect, or rephrase the user's name. Use it EXACTLY as given above.\n" +
            "5. To provide buttons, append this JSON at the VERY END: [[ACTIONS: [{\"label\": \"Text\", \"action\": \"NAVIGATE\", \"payload\": \"/path\"}] ]]\n" +
            "Paths: /dashboard/jobs, /dashboard/profile, /dashboard/applications",
            name, name, headline, skills
        );
    }

    private String generateTitle(String content) {
        if (content.length() > 30) return content.substring(0, 27) + "...";
        return content;
    }

    private ParsedResponse parseAiResponse(String raw) {
        try {
            String actionsMarker = "[[ACTIONS:";
            int startIndex = raw.lastIndexOf(actionsMarker);
            int endIndex = raw.lastIndexOf("]]");
            
            if (startIndex == -1 || endIndex == -1 || endIndex <= startIndex) {
                return new ParsedResponse(raw, null);
            }

            String text = raw.substring(0, startIndex).trim();
            String jsonPart = raw.substring(startIndex + actionsMarker.length(), endIndex).trim();
            
            List<ChatMessage.ChatAction> actions = objectMapper.readValue(jsonPart, 
                objectMapper.getTypeFactory().constructCollectionType(List.class, ChatMessage.ChatAction.class));
            return new ParsedResponse(text, actions);
        } catch (Exception e) {
            log.warn("Failed to parse AI assistant actions ({})", e.getClass().getSimpleName());
            // Strip the markers even if JSON fails to avoid showing them to user
            String cleanText = raw.replaceAll("\\[\\[ACTIONS:.*?\\]\\]", "").trim();
            return new ParsedResponse(cleanText, null);
        }
    }

    private record ParsedResponse(String text, List<ChatMessage.ChatAction> actions) {}
}
