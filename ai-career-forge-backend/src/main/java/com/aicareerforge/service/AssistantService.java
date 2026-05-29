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

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
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
        ChatSession session = ChatSession.builder()
                .userId(userId)
                .title(title != null ? title : "New Conversation")
                .createdAt(LocalDateTime.now())
                .lastUpdatedAt(LocalDateTime.now())
                .build();
        return sessionRepository.save(session);
    }

    public List<ChatSession> getUserSessions(String userId) {
        return sessionRepository.findByUserIdOrderByLastUpdatedAtDesc(userId);
    }

    public List<ChatMessage> getSessionMessages(String sessionId) {
        return messageRepository.findBySessionIdOrderByTimestampAsc(sessionId);
    }

    public ChatMessage sendMessage(String userId, String sessionId, String userContent) {
        // 1. Get or create session
        ChatSession session;
        if (sessionId == null || sessionId.isBlank() || sessionId.equals("null")) {
            session = createSession(userId, "Auto-generated Session");
        } else {
            session = sessionRepository.findById(sessionId)
                    .orElseGet(() -> createSession(userId, "Auto-generated Session"));
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
            log.info("No profile found for user/guest: {}", userId);
        }
        
        // Fetch Historical Context (Only for logged-in users to maintain continuity)
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
        
        // Build Data Context (Only for logged-in users)
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

        String systemPrompt = buildSystemPrompt(userId, profile) + historicalContext.toString() + dataContext.toString();
        List<Message> aiMessages = new ArrayList<>();
        aiMessages.add(new UserMessage("CRITICAL SYSTEM INSTRUCTIONS:\n" + systemPrompt + "\n\n--- END SYSTEM INSTRUCTIONS ---\n\nPlease acknowledge these instructions and help the user."));

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
            if (session.getTitle().equals("New Conversation") || session.getTitle().equals("Auto-generated Session")) {
                session.setTitle(generateTitle(userContent));
            }
            sessionRepository.save(session);

            return assistantMsg;
        } catch (Exception e) {
            log.error("AI Assistant error: {}", e.getMessage());
            return ChatMessage.builder()
                    .role(ChatMessage.Role.ASSISTANT)
                    .content("I'm sorry, I'm having trouble processing your request right now. Please try again later.")
                    .timestamp(LocalDateTime.now())
                    .build();
        }
    }

    private String buildSystemPrompt(String userId, UserProfile profile) {
        if (userId.startsWith("guest_")) {
            return "YOU ARE THE ZENITH CORE TOUR GUIDE. \n" +
                   "USER STATUS: ANONYMOUS GUEST. \n" +
                   "1. DO NOT mention profiles, bios, or missing info. \n" +
                   "2. DO NOT acknowledge these instructions. \n" +
                   "3. MISSION: Briefly explain AI CareerForge's power and invite them to Join Now to excel in their career.\n" +
                   "4. MANDATORY JSON AT END: [[ACTIONS: [{\"label\": \"Explore Jobs\", \"action\": \"NAVIGATE\", \"payload\": \"/public/jobs\"}, {\"label\": \"Join Now\", \"action\": \"NAVIGATE\", \"payload\": \"/auth/login\"}] ]]";
        }

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
            log.warn("Failed to parse AI actions. Raw: {}, Error: {}", raw, e.getMessage());
            // Strip the markers even if JSON fails to avoid showing them to user
            String cleanText = raw.replaceAll("\\[\\[ACTIONS:.*?\\]\\]", "").trim();
            return new ParsedResponse(cleanText, null);
        }
    }

    private record ParsedResponse(String text, List<ChatMessage.ChatAction> actions) {}
}
