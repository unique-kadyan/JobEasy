package com.kaddy.autoapply.service.ai;

import com.kaddy.autoapply.exception.AiServiceException;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import io.github.resilience4j.retry.annotation.Retry;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;

@Component
public class MistralAiProvider extends OpenAiCompatibleProvider {

    private static final Logger log = LoggerFactory.getLogger(MistralAiProvider.class);

    public MistralAiProvider(
            WebClient.Builder builder,
            @Value("${app.ai.mistral.api-key:}") String apiKey,
            @Value("${app.ai.mistral.model:mistral-small-latest}") String model) {
        super(builder, "https://api.mistral.ai", apiKey, model);
    }

    @Override
    public String getName() { return "MISTRAL"; }

    @Override
    @CircuitBreaker(name = "mistralAi", fallbackMethod = "fallback")
    @Retry(name = "freeAi")
    public String generateText(String systemPrompt, String userPrompt) {
        return super.generateText(systemPrompt, userPrompt);
    }

    @SuppressWarnings("unused")
    private String fallback(String s, String u, Throwable t) {
        log.warn("Mistral circuit open: {}", t.getMessage());
        throw new AiServiceException("Mistral unavailable", t);
    }
}
