package com.kaddy.autoapply.service.ai;

import com.kaddy.autoapply.exception.AiServiceException;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.MediaType;
import org.springframework.util.StringUtils;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.List;
import java.util.Map;

/**
 * Abstract base for any provider that exposes the OpenAI-compatible
 * /v1/chat/completions endpoint (Cerebras, Groq, Together, Mistral,
 * SambaNova, Novita, Gemini OpenAI-compat, OpenAI itself).
 */
public non-sealed abstract class OpenAiCompatibleProvider implements AiProvider {

    private static final ParameterizedTypeReference<Map<String, Object>> MAP_TYPE =
            new ParameterizedTypeReference<>() {};

    private final WebClient webClient;
    private final String apiKey;
    private final String model;

    protected OpenAiCompatibleProvider(WebClient.Builder builder, String baseUrl,
                                        String apiKey, String model) {
        this.webClient = builder.baseUrl(baseUrl).build();
        this.apiKey = apiKey;
        this.model = model;
    }

    @Override
    public boolean isAvailable() {
        return StringUtils.hasText(apiKey);
    }

    @Override
    @SuppressWarnings("unchecked")
    public String generateText(String systemPrompt, String userPrompt) {
        if (!isAvailable()) throw new AiServiceException(getName() + " API key not configured");
        try {
            Map<String, Object> requestBody = Map.of(
                    "model", model,
                    "max_tokens", 2048,
                    "messages", List.of(
                            Map.of("role", "system", "content", systemPrompt),
                            Map.of("role", "user", "content", userPrompt)
                    )
            );

            Map<String, Object> response = webClient.post()
                    .uri("/v1/chat/completions")
                    .header("Authorization", "Bearer " + apiKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .bodyValue(requestBody)
                    .retrieve()
                    .bodyToMono(MAP_TYPE)
                    .block();

            if (response == null || !response.containsKey("choices")) {
                throw new AiServiceException("Empty response from " + getName());
            }

            List<Map<String, Object>> choices = (List<Map<String, Object>>) response.get("choices");
            Map<String, Object> message = (Map<String, Object>) choices.get(0).get("message");
            return (String) message.get("content");
        } catch (AiServiceException e) {
            throw e;
        } catch (RuntimeException e) {
            throw new AiServiceException(getName() + " API call failed: " + e.getMessage(), e);
        }
    }
}
