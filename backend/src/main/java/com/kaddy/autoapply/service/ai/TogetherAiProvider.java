package com.kaddy.autoapply.service.ai;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.reactive.function.client.WebClient;

import com.kaddy.autoapply.exception.AiServiceException;

import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import io.github.resilience4j.retry.annotation.Retry;

public class TogetherAiProvider extends OpenAiCompatibleProvider {

    private static final Logger log = LoggerFactory.getLogger(TogetherAiProvider.class);

    private final String providerName;

    public TogetherAiProvider(WebClient.Builder builder, String apiKey, String model, String providerName) {
        super(builder, "https://api.together.xyz", apiKey, model);
        this.providerName = providerName;
    }

    @Override
    public String getName() {
        return providerName;
    }

    @Override
    @CircuitBreaker(name = "togetherAi", fallbackMethod = "fallback")
    @Retry(name = "freeAi")
    public String generateText(String systemPrompt, String userPrompt) {
        return super.generateText(systemPrompt, userPrompt);
    }

    @SuppressWarnings("unused")
    private String fallback(String s, String u, Throwable t) {
        log.warn("Together AI circuit open: {}", t.getMessage());
        throw new AiServiceException("Together AI unavailable", t);
    }
}
