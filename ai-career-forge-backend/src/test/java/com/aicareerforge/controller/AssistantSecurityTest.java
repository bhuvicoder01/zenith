package com.aicareerforge.controller;

import com.aicareerforge.config.SecurityConfig;
import com.aicareerforge.model.ChatMessage;
import com.aicareerforge.model.User;
import com.aicareerforge.security.CustomUserDetailsService;
import com.aicareerforge.security.JwtAuthenticationFilter;
import com.aicareerforge.security.JwtService;
import com.aicareerforge.security.OAuth2SuccessHandler;
import com.aicareerforge.service.AssistantService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.oauth2.client.registration.ClientRegistration;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.security.oauth2.client.registration.InMemoryClientRegistrationRepository;
import org.springframework.security.oauth2.core.AuthorizationGrantType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.junit.jupiter.web.SpringJUnitWebConfig;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.servlet.config.annotation.EnableWebMvc;

import java.util.List;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

// Explicit MVC/security context: no application startup, .env files, MongoDB,
// mail service, or AI provider is loaded by these HTTP boundary tests.
@SpringJUnitWebConfig(classes = {AssistantController.class, RequestValidationHandler.class, SecurityConfig.class,
        AssistantSecurityTest.TestConfig.class})
@TestPropertySource(properties = {
        "cors.allowed-origins=http://localhost:3000",
        "jwt.expiration=3600000",
        "jwt.secret=test-only-not-a-real-signing-key-0123456789"
})
class AssistantSecurityTest {
    @Autowired WebApplicationContext context;
    @Autowired AssistantService assistant;
    @Autowired JwtService jwtService;
    private MockMvc mvc;
    private final User alice = User.builder().id("alice").email("alice@example.invalid").role(User.Role.USER).build();

    @BeforeEach
    void setUp() {
        reset(assistant, jwtService);
        mvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
    }

    @Test
    void anonymousRequestsCannotReadCreateOrSendEvenWithSpoofedGuestHeaders() throws Exception {
        mvc.perform(get("/api/v1/assistant/sessions").header("X-Guest-ID", "alice"))
                .andExpect(status().isUnauthorized());
        mvc.perform(get("/api/v1/assistant/sessions/owned/messages")
                        .header("X-Guest-ID", "alice").header("X-Forwarded-For", "127.0.0.1"))
                .andExpect(status().isUnauthorized());
        mvc.perform(post("/api/v1/assistant/sessions").contentType(MediaType.APPLICATION_JSON)
                        .header("X-Guest-ID", "alice").content("{\"title\":\"Spoofed\"}"))
                .andExpect(status().isUnauthorized());
        mvc.perform(post("/api/v1/assistant/chat").contentType(MediaType.APPLICATION_JSON)
                        .header("X-Guest-ID", "alice").content("{\"sessionId\":\"owned\",\"message\":\"Hello\"}"))
                .andExpect(status().isUnauthorized());
        verifyNoInteractions(assistant);
    }

    @Test
    void invalidBearerTokenDoesNotGrantGuestAccess() throws Exception {
        when(jwtService.extractUsername(anyString())).thenThrow(new IllegalArgumentException("Invalid test token"));
        mvc.perform(get("/api/v1/assistant/sessions").header("Authorization", "Bearer invalid")
                        .header("X-Guest-ID", "alice"))
                .andExpect(status().isUnauthorized());
        verifyNoInteractions(assistant);
    }

    @Test
    void authenticatedPrincipalWinsOverClientSuppliedOwnerHeaders() throws Exception {
        when(assistant.getSessionMessages("alice", "owned")).thenReturn(List.of());
        mvc.perform(get("/api/v1/assistant/sessions/owned/messages").with(user(alice))
                        .header("X-Guest-ID", "someone-else"))
                .andExpect(status().isOk()).andExpect(content().json("[]"));
        verify(assistant).getSessionMessages("alice", "owned");
    }

    @Test
    void foreignAndUnknownSessionsHaveIdenticalNotFoundStatus() throws Exception {
        when(assistant.getSessionMessages("alice", "foreign"))
                .thenThrow(new ResponseStatusException(HttpStatus.NOT_FOUND, "Conversation not found"));
        when(assistant.getSessionMessages("alice", "missing"))
                .thenThrow(new ResponseStatusException(HttpStatus.NOT_FOUND, "Conversation not found"));
        mvc.perform(get("/api/v1/assistant/sessions/foreign/messages").with(user(alice)))
                .andExpect(status().isNotFound());
        mvc.perform(get("/api/v1/assistant/sessions/missing/messages").with(user(alice)))
                .andExpect(status().isNotFound());
    }

    @Test
    void sendsChatUsingOnlyTheAuthenticatedUserId() throws Exception {
        when(assistant.sendMessage("alice", "owned", "Hello"))
                .thenReturn(ChatMessage.builder().sessionId("owned").userId("alice")
                        .role(ChatMessage.Role.ASSISTANT).content("Welcome").build());
        mvc.perform(post("/api/v1/assistant/chat").with(user(alice))
                        .header("X-Guest-ID", "victim").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"sessionId\":\"owned\",\"message\":\"Hello\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.userId").value("alice"));
        verify(assistant).sendMessage("alice", "owned", "Hello");
    }

    @Test
    void invalidChatInputsAreRejectedBeforeServiceWork() throws Exception {
        for (String body : List.of("{}", "{\"message\":\" \"}",
                "{\"message\":\"" + "a".repeat(8001) + "\"}",
                "{\"message\":\"Hello\",\"sessionId\":\"" + "s".repeat(129) + "\"}")) {
            mvc.perform(post("/api/v1/assistant/chat").with(user(alice))
                            .contentType(MediaType.APPLICATION_JSON).content(body))
                    .andExpect(status().isBadRequest())
                    .andExpect(content().json("{\"error\":\"Invalid request\",\"fields\":[\""
                            + (body.contains("sessionId") ? "sessionId" : "message") + "\"]}", true));
        }
        verifyNoInteractions(assistant);
    }

    @Test
    void oversizedSessionTitleIsRejectedBeforeServiceWork() throws Exception {
        mvc.perform(post("/api/v1/assistant/sessions").with(user(alice))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"" + "t".repeat(121) + "\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(content().json("{\"error\":\"Invalid request\",\"fields\":[\"title\"]}", true));
        verifyNoInteractions(assistant);
    }

    @Configuration
    @EnableWebMvc
    static class TestConfig {
        @Bean AssistantService assistantService() { return mock(AssistantService.class); }
        @Bean JwtService jwtService() { return mock(JwtService.class); }
        @Bean CustomUserDetailsService userDetailsService() { return mock(CustomUserDetailsService.class); }
        @Bean OAuth2SuccessHandler oAuth2SuccessHandler() { return mock(OAuth2SuccessHandler.class); }
        @Bean AuthenticationProvider authenticationProvider() { return mock(AuthenticationProvider.class); }
        @Bean JwtAuthenticationFilter jwtAuthenticationFilter(JwtService jwt, CustomUserDetailsService users) {
            return new JwtAuthenticationFilter(jwt, users);
        }
        @Bean ClientRegistrationRepository clientRegistrationRepository() {
            ClientRegistration registration = ClientRegistration.withRegistrationId("test")
                    .clientId("test-client").clientSecret("test-secret")
                    .authorizationGrantType(AuthorizationGrantType.AUTHORIZATION_CODE)
                    .redirectUri("http://localhost/login/oauth2/code/test")
                    .authorizationUri("https://example.invalid/authorize")
                    .tokenUri("https://example.invalid/token")
                    .userInfoUri("https://example.invalid/userinfo")
                    .userNameAttributeName("id").clientName("Test OAuth").build();
            return new InMemoryClientRegistrationRepository(registration);
        }
    }
}
