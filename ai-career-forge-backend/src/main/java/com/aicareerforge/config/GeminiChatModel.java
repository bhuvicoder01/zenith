package com.aicareerforge.config;

import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.chat.model.ChatResponse;
import org.springframework.ai.chat.model.Generation;
import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.ai.chat.messages.Message;
import org.springframework.ai.chat.messages.MessageType;
import org.springframework.web.client.RestTemplate;
import org.springframework.ai.chat.prompt.ChatOptions;

import java.util.List;
import java.util.Map;
import java.util.ArrayList;
import java.util.stream.Collectors;

/**
 * Custom ChatModel to bypass OpenAI-compatible translation layer limitations
 * and call Google's native Gemini API directly.
 * 
 * Uses gemini-1.5-flash to unlock the 1,500 requests/day free tier.
 */
public class GeminiChatModel implements ChatModel {

    private final String apiKey;
    private final String modelName;
    private final RestTemplate restTemplate;
    private static final String API_URL = "https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent";

    public GeminiChatModel(String apiKey, String modelName) {
        this.apiKey = apiKey;
        this.modelName = modelName;
        this.restTemplate = new RestTemplate();
    }

    @Override
    public ChatResponse call(Prompt prompt) {
        String url = String.format(API_URL, modelName) + "?key=" + apiKey;

        String systemInstruction = "";
        List<Map<String, Object>> contents = new ArrayList<>();

        // Parse instructions into Gemini's native contents and systemInstruction schema
        for (Message message : prompt.getInstructions()) {
            if (message.getMessageType() == MessageType.SYSTEM) {
                systemInstruction = message.getContent();
            } else {
                String role = "user";
                if (message.getMessageType() == MessageType.ASSISTANT) {
                    role = "model";
                }
                contents.add(Map.of(
                    "role", role,
                    "parts", List.of(Map.of("text", message.getContent()))
                ));
            }
        }

        // Build the request body
        Map<String, Object> requestBody = new java.util.HashMap<>();
        requestBody.put("contents", contents);

        if (systemInstruction != null && !systemInstruction.isEmpty()) {
            requestBody.put("systemInstruction", Map.of(
                "parts", List.of(Map.of("text", systemInstruction))
            ));
        }

        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> response = restTemplate.postForObject(url, requestBody, Map.class);

            if (response == null || !response.containsKey("candidates")) {
                throw new RuntimeException("Invalid response from Gemini: " + response);
            }

            @SuppressWarnings("unchecked")
            List<Map<String, Object>> candidates = (List<Map<String, Object>>) response.get("candidates");
            if (candidates.isEmpty()) {
                throw new RuntimeException("Gemini returned empty candidates");
            }

            @SuppressWarnings("unchecked")
            Map<String, Object> firstCandidate = candidates.get(0);
            @SuppressWarnings("unchecked")
            Map<String, Object> content = (Map<String, Object>) firstCandidate.get("content");
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> parts = (List<Map<String, Object>>) content.get("parts");

            String responseText = parts.stream()
                .map(part -> (String) part.get("text"))
                .collect(Collectors.joining(""));

            Generation generation = new Generation(responseText);
            return new ChatResponse(List.of(generation));
        } catch (Exception e) {
            throw new RuntimeException("Gemini Chat API Error: " + e.getMessage(), e);
        }
    }

    @Override
    public ChatOptions getDefaultOptions() {
        return null;
    }
}
