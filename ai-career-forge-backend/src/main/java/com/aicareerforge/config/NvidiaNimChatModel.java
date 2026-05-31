package com.aicareerforge.config;

import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.chat.model.ChatResponse;
import org.springframework.ai.chat.model.Generation;
import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.ai.chat.messages.Message;
import org.springframework.ai.chat.messages.MessageType;
import org.springframework.web.client.RestTemplate;
import org.springframework.http.HttpEntity;
import org.springframework.ai.chat.prompt.ChatOptions;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;

import java.util.List;
import java.util.Map;
import java.util.ArrayList;
import java.util.stream.Collectors;

/**
 * Custom ChatModel for NVIDIA NIM (OpenAI-compatible chat completions endpoint).
 */
public class NvidiaNimChatModel implements ChatModel {

    private final String apiKey;
    private final String modelName;
    private final String baseUrl;
    private final RestTemplate restTemplate;

    public NvidiaNimChatModel(String apiKey, String modelName, String baseUrl) {
        this.apiKey = apiKey;
        this.modelName = modelName;
        this.baseUrl = baseUrl != null && !baseUrl.isEmpty() ? baseUrl : "https://integrate.api.nvidia.com/v1";
        this.restTemplate = new RestTemplate();
    }

    @Override
    public ChatResponse call(Prompt prompt) {
        String url = baseUrl + "/chat/completions";

        List<Map<String, Object>> messages = new ArrayList<>();

        for (Message message : prompt.getInstructions()) {
            String role = "user";
            if (message.getMessageType() == MessageType.SYSTEM) {
                role = "system";
            } else if (message.getMessageType() == MessageType.ASSISTANT) {
                role = "assistant";
            }
            
            messages.add(Map.of(
                "role", role,
                "content", message.getContent()
            ));
        }

        // Build the request body
        Map<String, Object> requestBody = Map.of(
            "model", modelName,
            "messages", messages,
            "temperature", 0.2
        );

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(apiKey);

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> response = restTemplate.postForObject(url, entity, Map.class);

            if (response == null || !response.containsKey("choices")) {
                throw new RuntimeException("Invalid response from NVIDIA NIM: " + response);
            }

            @SuppressWarnings("unchecked")
            List<Map<String, Object>> choices = (List<Map<String, Object>>) response.get("choices");
            if (choices.isEmpty()) {
                throw new RuntimeException("NVIDIA NIM returned empty choices");
            }

            @SuppressWarnings("unchecked")
            Map<String, Object> firstChoice = choices.get(0);
            @SuppressWarnings("unchecked")
            Map<String, Object> message = (Map<String, Object>) firstChoice.get("message");
            String responseText = (String) message.get("content");

            Generation generation = new Generation(responseText);
            return new ChatResponse(List.of(generation));
        } catch (Exception e) {
            throw new RuntimeException("NVIDIA NIM Chat API Error: " + e.getMessage(), e);
        }
    }

    @Override
    public ChatOptions getDefaultOptions() {
        return null;
    }
}
