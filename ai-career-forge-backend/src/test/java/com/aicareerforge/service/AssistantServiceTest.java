package com.aicareerforge.service;

import com.aicareerforge.model.ChatMessage;
import com.aicareerforge.model.ChatSession;
import com.aicareerforge.repository.ApplicationRepository;
import com.aicareerforge.repository.ChatMessageRepository;
import com.aicareerforge.repository.ChatSessionRepository;
import com.aicareerforge.repository.JobRepository;
import com.aicareerforge.repository.UserJobMatchRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AssistantServiceTest {
    @Mock(answer = org.mockito.Answers.RETURNS_DEEP_STUBS) ChatClient chatClient;
    @Mock ChatMessageRepository messages;
    @Mock ChatSessionRepository sessions;
    @Mock UserProfileService profiles;
    @Mock UserJobMatchRepository matches;
    @Mock ApplicationRepository applications;
    @Mock JobRepository jobs;

    private AssistantService service;

    @BeforeEach
    void setUp() {
        service = new AssistantService(chatClient, messages, sessions, profiles,
                new ObjectMapper(), matches, applications, jobs);
    }

    @Test
    void ownerCanReadConversationHistory() {
        ChatSession session = session("alice", "owned");
        ChatMessage message = ChatMessage.builder().sessionId("owned").userId("alice")
                .role(ChatMessage.Role.USER).content("My career question").build();
        when(sessions.findByIdAndUserId("owned", "alice")).thenReturn(Optional.of(session));
        when(messages.findBySessionIdOrderByTimestampAsc("owned")).thenReturn(List.of(message));

        assertThat(service.getSessionMessages("alice", "owned")).containsExactly(message);
        verify(sessions).findByIdAndUserId("owned", "alice");
        verifyNoInteractions(chatClient, profiles, matches, applications, jobs);
    }

    @ParameterizedTest
    @ValueSource(strings = {"another-users-session", "missing-session", "null"})
    void cannotReadForeignOrMissingConversation(String sessionId) {
        when(sessions.findByIdAndUserId(sessionId, "alice")).thenReturn(Optional.empty());

        ResponseStatusException exception = assertThrows(ResponseStatusException.class,
                () -> service.getSessionMessages("alice", sessionId));

        assertThat(exception.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(exception.getReason()).isEqualTo("Conversation not found");
        verifyNoInteractions(messages, chatClient, profiles, matches, applications, jobs);
    }

    @ParameterizedTest
    @ValueSource(strings = {"another-users-session", "missing-session", "null"})
    void cannotWriteToForeignOrMissingConversationOrSilentlyCreateReplacement(String sessionId) {
        when(sessions.findByIdAndUserId(sessionId, "alice")).thenReturn(Optional.empty());

        ResponseStatusException exception = assertThrows(ResponseStatusException.class,
                () -> service.sendMessage("alice", sessionId, "Hello"));

        assertThat(exception.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        verify(sessions, never()).save(any());
        verifyNoInteractions(messages, chatClient, profiles, matches, applications, jobs);
    }

    @Test
    void ownerCanContinueConversationAndBothMessagesKeepTheOwner() {
        ChatSession session = session("alice", "owned");
        when(sessions.findByIdAndUserId("owned", "alice")).thenReturn(Optional.of(session));
        when(sessions.findByUserIdOrderByLastUpdatedAtDesc("alice")).thenReturn(List.of(session));
        when(messages.findBySessionIdOrderByTimestampAsc("owned")).thenReturn(List.of());
        when(matches.findByUserIdOrderByMatchScoreDesc("alice")).thenReturn(List.of());
        when(applications.findByUserId("alice")).thenReturn(List.of());
        when(chatClient.prompt().messages(anyList()).call().content()).thenReturn("Start with one relevant project.");

        ChatMessage result = service.sendMessage("alice", "owned", "How should I prepare?");

        assertThat(result.getSessionId()).isEqualTo("owned");
        assertThat(result.getUserId()).isEqualTo("alice");
        assertThat(result.getRole()).isEqualTo(ChatMessage.Role.ASSISTANT);
        assertThat(result.getContent()).isEqualTo("Start with one relevant project.");
        ArgumentCaptor<ChatMessage> saved = ArgumentCaptor.forClass(ChatMessage.class);
        verify(messages, times(2)).save(saved.capture());
        assertThat(saved.getAllValues()).allSatisfy(message -> {
            assertThat(message.getUserId()).isEqualTo("alice");
            assertThat(message.getSessionId()).isEqualTo("owned");
        });
    }

    @Test
    void rejectsMissingIdentityBeforeReadingOrWritingData() {
        assertThat(assertThrows(ResponseStatusException.class,
                () -> service.getUserSessions(null)).getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(assertThrows(ResponseStatusException.class,
                () -> service.createSession(" ", "Test")).getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(assertThrows(ResponseStatusException.class,
                () -> service.sendMessage(null, "owned", "Hello")).getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        verifyNoInteractions(sessions, messages, chatClient, profiles, matches, applications, jobs);
    }

    @Test
    void rejectsBlankAndOversizeMessagesBeforeCreatingOrReadingSessions() {
        for (String text : new String[] {null, "", "   ", "a".repeat(8001)}) {
            ResponseStatusException exception = assertThrows(ResponseStatusException.class,
                    () -> service.sendMessage("alice", null, text));
            assertThat(exception.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        }
        verifyNoInteractions(sessions, messages, chatClient, profiles, matches, applications, jobs);
    }

    @Test
    void newConversationIsAlwaysOwnedByCaller() {
        when(sessions.save(any(ChatSession.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ChatSession created = service.createSession("alice", "  My next role  ");

        assertThat(created.getUserId()).isEqualTo("alice");
        assertThat(created.getTitle()).isEqualTo("My next role");
        assertThat(created.getCreatedAt()).isNotNull();
    }

    private ChatSession session(String userId, String id) {
        return ChatSession.builder().id(id).userId(userId).title("Career questions").build();
    }
}
