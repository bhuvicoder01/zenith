package com.aicareerforge.config;

import org.springframework.ai.document.Document;
import org.springframework.ai.embedding.Embedding;
import org.springframework.ai.embedding.EmbeddingModel;
import org.springframework.ai.embedding.EmbeddingRequest;
import org.springframework.ai.embedding.EmbeddingResponse;
import org.springframework.web.client.RestTemplate;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Custom EmbeddingModel for NVIDIA NIM (OpenAI-compatible embeddings endpoint).
 */
public class NvidiaNimEmbeddingModel implements EmbeddingModel {

    private final String apiKey;
    private final String modelName;
    private final String baseUrl;
    private final RestTemplate restTemplate;

    public NvidiaNimEmbeddingModel(String apiKey, String modelName, String baseUrl) {
        this.apiKey = apiKey;
        this.modelName = modelName;
        this.baseUrl = baseUrl != null && !baseUrl.isEmpty() ? baseUrl : "https://integrate.api.nvidia.com/v1";
        this.restTemplate = new RestTemplate();
    }

    @Override
    public List<Double> embed(Document document) {
        return embed(document.getContent());
    }

    @Override
    public List<Double> embed(String text) {
        String url = baseUrl + "/embeddings";

        // Auto-detect input_type for NVIDIA models
        String inputType = "query";
        if (text.startsWith("Title:") || text.length() > 250) {
            inputType = "passage";
        }

        Map<String, Object> requestBody = Map.of(
            "input", text,
            "model", modelName,
            "input_type", inputType,
            "truncate", "END",
            "encoding_format", "float"
        );

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(apiKey);

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> response = restTemplate.postForObject(url, entity, Map.class);

            if (response == null || !response.containsKey("data")) {
                throw new RuntimeException("Invalid response from NVIDIA NIM Embeddings: " + response);
            }

            @SuppressWarnings("unchecked")
            List<Map<String, Object>> dataList = (List<Map<String, Object>>) response.get("data");
            if (dataList.isEmpty()) {
                throw new RuntimeException("NVIDIA NIM Embeddings returned empty data list");
            }

            @SuppressWarnings("unchecked")
            Map<String, Object> data = dataList.get(0);
            @SuppressWarnings("unchecked")
            List<Double> values = (List<Double>) data.get("embedding");
            
            if (values != null) {
                System.err.println("DEBUG: NVIDIA NIM Embedding produced vector with size: " + values.size());
            }
            return values;
        } catch (Exception e) {
            throw new RuntimeException("NVIDIA NIM Embedding API Error: " + e.getMessage(), e);
        }
    }

    @Override
    public EmbeddingResponse call(EmbeddingRequest request) {
        List<Embedding> embeddings = new ArrayList<>();
        int index = 0;
        for (String text : request.getInstructions()) {
            List<Double> vector = embed(text);
            embeddings.add(new Embedding(vector, index++));
        }
        return new EmbeddingResponse(embeddings);
    }
}
