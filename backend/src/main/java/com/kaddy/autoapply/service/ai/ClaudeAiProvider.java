package com.kaddy.autoapply.service.ai;

import com.kaddy.autoapply.exception.AiServiceException;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import io.github.resilience4j.retry.annotation.Retry;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.List;
import java.util.Map;

@Component
public class ClaudeAiProvider implements AiProvider {

    private static final Logger log = LoggerFactory.getLogger(ClaudeAiProvider.class);

    private static final ParameterizedTypeReference<Map<String, Object>> MAP_TYPE =
            new ParameterizedTypeReference<>() {};

    private final WebClient webClient;
    private final String apiKey;
    private final String model;

    public ClaudeAiProvider(
            WebClient.Builder webClientBuilder,
            @Value("${app.ai.claude.api-key}") String apiKey,
            @Value("${app.ai.claude.model}") String model) {
        this.webClient = webClientBuilder.baseUrl("https://api.anthropic.com").build();
        this.apiKey = apiKey;
        this.model = model;
    }

    @Override
    public String getName() { return "CLAUDE"; }

    @Override
    public boolean isAvailable() { return StringUtils.hasText(apiKey); }

    @Override
    @CircuitBreaker(name = "claudeAi", fallbackMethod = "fallback")
    @Retry(name = "claudeAi")
    @SuppressWarnings("unchecked")
    public String generateText(String systemPrompt, String userPrompt) {
        if (!isAvailable()) throw new AiServiceException("Claude API key not configured");
        try {
            Map<String, Object> requestBody = Map.of(
                    "model", model,
                    "max_tokens", 2048,
                    "system", systemPrompt,
                    "messages", List.of(Map.of("role", "user", "content", userPrompt))
            );

            Map<String, Object> response = webClient.post()
                    .uri("/v1/messages")
                    .header("x-api-key", apiKey)
                    .header("anthropic-version", "2023-06-01")
                    .contentType(MediaType.APPLICATION_JSON)
                    .bodyValue(requestBody)
                    .retrieve()
                    .bodyToMono(MAP_TYPE)
                    .block();

            if (response == null || !response.containsKey("content")) {
                throw new AiServiceException("Empty response from Claude API");
            }

            List<Map<String, Object>> content = (List<Map<String, Object>>) response.get("content");
            return content.stream()
                    .filter(c -> "text".equals(c.get("type")))
                    .map(c -> (String) c.get("text"))
                    .findFirst()
                    .orElseThrow(() -> new AiServiceException("No text in Claude response"));
        } catch (AiServiceException e) {
            throw e;
        } catch (RuntimeException e) {
            throw new AiServiceException("Claude API call failed: " + e.getMessage(), e);
        }
    }

    @SuppressWarnings("unused")
    private String fallback(String systemPrompt, String userPrompt, Throwable t) {
        log.error("Claude circuit breaker open: {}", t.getMessage());
        throw new AiServiceException("Claude service temporarily unavailable", t);
    }
}
