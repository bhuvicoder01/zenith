package com.aicareerforge.config;

import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.embedding.EmbeddingModel;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.context.annotation.Profile;
import org.springframework.retry.backoff.ExponentialBackOffPolicy;
import org.springframework.retry.policy.SimpleRetryPolicy;
import org.springframework.retry.support.RetryTemplate;

import java.util.Map;

/**
 * Custom AI configuration renamed to AiProviderConfig to bypass Git/OS case-sensitivity traps.
 */
@Configuration
public class AiProviderConfig {

    @Value("${GOOGLE_AI_API_KEY:}")
    private String googleApiKey;

    @Value("${spring.ai.openai.chat.api-key:}")
    private String chatApiKey;

    @Value("${spring.ai.openai.chat.base-url:https://integrate.api.nvidia.com}")
    private String chatBaseUrl;

    @Value("${spring.ai.openai.chat.options.model:meta/llama-3.1-70b-instruct}")
    private String chatModelName;

    @Value("${spring.ai.openai.embedding.api-key:}")
    private String embeddingApiKey;

    @Value("${spring.ai.openai.embedding.base-url:}")
    private String embeddingBaseUrl;

    @Value("${spring.ai.openai.embedding.options.model:nvidia/nv-embedqa-e5-v5}")
    private String embeddingModelName;

    @Bean
    public RetryTemplate aiRetryTemplate() {
        RetryTemplate retryTemplate = new RetryTemplate();

        // Exponential backoff starting at 3s and doubling up to 25s
        ExponentialBackOffPolicy backOffPolicy = new ExponentialBackOffPolicy();
        backOffPolicy.setInitialInterval(3000);
        backOffPolicy.setMultiplier(2.0);
        backOffPolicy.setMaxInterval(25000);
        retryTemplate.setBackOffPolicy(backOffPolicy);

        // Retry 3 times for transient errors
        SimpleRetryPolicy retryPolicy = new SimpleRetryPolicy(3, Map.of(Exception.class, true));
        retryTemplate.setRetryPolicy(retryPolicy);

        return retryTemplate;
    }

    private String getEmbeddingApiKey() {
        if (embeddingApiKey != null && !embeddingApiKey.trim().isEmpty()) {
            return embeddingApiKey;
        }
        return chatApiKey;
    }

    private String getEmbeddingBaseUrl() {
        if (embeddingBaseUrl != null && !embeddingBaseUrl.trim().isEmpty()) {
            return embeddingBaseUrl;
        }
        return chatBaseUrl;
    }

    private String cleanBaseUrl(String url) {
        if (url == null || url.trim().isEmpty()) {
            return "https://integrate.api.nvidia.com/v1";
        }
        url = url.trim();
        if (!url.endsWith("/v1") && !url.endsWith("/v1/")) {
            if (url.endsWith("/")) {
                url = url + "v1";
            } else {
                url = url + "/v1";
            }
        }
        return url;
    }

    /**
     * Custom EmbeddingModel for production/development.
     * Instantiates NvidiaNimEmbeddingModel if configure, otherwise Gemini.
     */
    @Bean(name = "embeddingModel")
    @Primary
    public EmbeddingModel prodEmbeddingModel() {
        String key = getEmbeddingApiKey();
        if (key != null && !key.trim().isEmpty()) {
            String baseUrl = cleanBaseUrl(getEmbeddingBaseUrl());
            System.out.println("[AI Configuration] Initializing NVIDIA NIM EmbeddingModel with model: " + embeddingModelName + " at " + baseUrl);
            return new NvidiaNimEmbeddingModel(key, embeddingModelName, baseUrl);
        }
        System.out.println("[AI Configuration] NVIDIA NIM API key not configured. Falling back to Google Gemini EmbeddingModel.");
        return new GeminiEmbeddingModel(googleApiKey);
    }

    /**
     * ChatModel for production/development.
     * Instantiates NvidiaNimChatModel if configured, otherwise Gemini.
     */
    @Bean
    @Primary
    public ChatModel chatModel(RetryTemplate aiRetryTemplate) {
        if (chatApiKey != null && !chatApiKey.trim().isEmpty()) {
            String baseUrl = cleanBaseUrl(chatBaseUrl);
            System.out.println("[AI Configuration] Initializing NVIDIA NIM ChatModel with model: " + chatModelName + " at " + baseUrl);
            return new NvidiaNimChatModel(chatApiKey, chatModelName, baseUrl);
        }
        System.out.println("[AI Configuration] NVIDIA NIM API key not configured. Falling back to Google Gemini ChatModel.");
        return new GeminiChatModel(googleApiKey, "gemini-1.5-flash");
    }
}
