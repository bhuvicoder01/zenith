package com.aicareerforge.config;

import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.openai.OpenAiChatModel;
import org.springframework.ai.openai.api.OpenAiApi;
import org.springframework.ai.openai.OpenAiChatOptions;
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
    private String apiKey;

    @Value("${GOOGLE_AI_MODEL:gemini-2.5-flash}")
    private String modelName;

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

    /**
     * Custom Gemini EmbeddingModel for production (Render).
     * This bypasses the buggy Spring AI OpenAI starter NPE.
     */
    @Bean(name = "embeddingModel")
    @Primary
    public EmbeddingModel prodEmbeddingModel() {
        return new GeminiEmbeddingModel(apiKey);
    }

    /**
     * Manual ChatModel definition for production (Gemini via OpenAI endpoint).
     */
    @Bean
    @Primary
    public ChatModel chatModel(RetryTemplate aiRetryTemplate) {
        OpenAiApi openAiApi = new OpenAiApi(
            "https://generativelanguage.googleapis.com/v1beta/openai", 
            apiKey
        );
        
        return new OpenAiChatModel(openAiApi, OpenAiChatOptions.builder()
            .withModel(modelName)
            .withTemperature(0.7f)
            .build(), 
            null, // Observation registry
            aiRetryTemplate);
    }
}
