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
public class OpenAiProvider implements AiProvider {

    private static final Logger log = LoggerFactory.getLogger(OpenAiProvider.class);

    private static final ParameterizedTypeReference<Map<String, Object>> MAP_TYPE =
            new ParameterizedTypeReference<>() {};

    private final WebClient webClient;
    private final String apiKey;
    private final String model;

    public OpenAiProvider(
            WebClient.Builder webClientBuilder,
            @Value("${app.ai.openai.api-key}") String apiKey,
            @Value("${app.ai.openai.model}") String model) {
        this.webClient = webClientBuilder.baseUrl("https://api.openai.com").build();
        this.apiKey = apiKey;
        this.model = model;
    }

    @Override
    public String getName() { return "OPENAI"; }

    @Override
    public boolean isAvailable() { return StringUtils.hasText(apiKey); }

    @Override
    @CircuitBreaker(name = "openAi", fallbackMethod = "fallback")
    @Retry(name = "openAi")
    @SuppressWarnings("unchecked")
    public String generateText(String systemPrompt, String userPrompt) {
        if (!isAvailable()) throw new AiServiceException("OpenAI API key not configured");
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
                throw new AiServiceException("Empty response from OpenAI API");
            }

            List<Map<String, Object>> choices = (List<Map<String, Object>>) response.get("choices");
            Map<String, Object> message = (Map<String, Object>) choices.get(0).get("message");
            return (String) message.get("content");
        } catch (AiServiceException e) {
            throw e;
        } catch (RuntimeException e) {
            throw new AiServiceException("OpenAI API call failed: " + e.getMessage(), e);
        }
    }

    @SuppressWarnings("unused")
    private String fallback(String systemPrompt, String userPrompt, Throwable t) {
        log.error("OpenAI circuit breaker open: {}", t.getMessage());
        throw new AiServiceException("OpenAI service temporarily unavailable", t);
    }
}
