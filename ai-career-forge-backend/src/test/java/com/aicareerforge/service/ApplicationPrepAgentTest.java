package com.aicareerforge.service;

import com.aicareerforge.model.UserProfile;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.ai.chat.client.ChatClient;

import java.util.List;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

class ApplicationPrepAgentTest {
    private final ChatClient client = mock(ChatClient.class);
    private final ChatClient.ChatClientRequest request = mock(ChatClient.ChatClientRequest.class, RETURNS_SELF);
    private final ChatClient.ChatClientRequest.CallResponseSpec response =
            mock(ChatClient.ChatClientRequest.CallResponseSpec.class);
    private final ApplicationPrepAgent agent = new ApplicationPrepAgent(client, new ObjectMapper());

    @BeforeEach
    void setUp() {
        when(client.prompt()).thenReturn(request);
        when(request.call()).thenReturn(response);
    }

    @Test
    void selectsEvidenceWithoutSendingAccountSecretsOrAdoptingInventedClaims() {
        when(response.content()).thenReturn("""
                {"skillIndices":[0],"experienceIndices":[],"projectIndices":[],
                 "certificationIndices":[],"internshipIndices":[],"resumeSummary":"Invented qualification"}
                """);
        UserProfile profile = UserProfile.builder().fullName("Asha Rao").skills(List.of("Java"))
                .headline("Backend developer").e2eePrivateKey("SECRET-KEY").rawResumeText("RAW-UNNEEDED").build();
        var result = agent.tailorResume(profile, "Needs Java and Kubernetes");
        assertThat(result.get("topSkills")).isEqualTo(List.of("Java"));
        assertThat(result.get("resumeSummary")).isEqualTo("Backend developer");
        ArgumentCaptor<String> payload = ArgumentCaptor.forClass(String.class);
        verify(request).user(payload.capture());
        assertThat(payload.getValue()).contains("Java").doesNotContain("SECRET-KEY", "RAW-UNNEEDED", "e2eePrivateKey");
        verify(request).system(anyString());
    }

    @Test
    void malformedOrOutOfRangeModelOutputFallsBackToActualProfile() {
        UserProfile profile = UserProfile.builder().skills(List.of("Java")).build();
        when(response.content()).thenReturn("{\"skillIndices\":[20]");
        assertThat(agent.tailorResume(profile, "A job").get("topSkills")).isEqualTo(List.of("Java"));
        when(response.content()).thenReturn("""
                {"skillIndices":[20],"experienceIndices":[],"projectIndices":[],
                 "certificationIndices":[],"internshipIndices":[]}
                """);
        assertThat(agent.tailorResume(profile, "A job").get("topSkills")).isEqualTo(List.of("Java"));
    }

    @Test
    void failedCommunicationIsNotPresentedAsACompletedPlaceholderDocument() {
        when(response.content()).thenReturn("{\"coverLetter\":\"\",\"emailIntro\":\"\"}");
        assertThatThrownBy(() -> agent.generateCommunicationKit("Resume facts", "Requirements"))
                .isInstanceOf(IllegalStateException.class).hasMessageContaining("Please try again");
        when(response.content()).thenThrow(new IllegalStateException("PRIVATE-PROVIDER-CONTENT"));
        assertThatThrownBy(() -> agent.generateCommunicationKit("Resume facts", "Requirements"))
                .hasMessageNotContaining("PRIVATE-PROVIDER-CONTENT");
    }
}
