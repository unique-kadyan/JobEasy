package com.kaddy.autoapply.service.ai;

import com.kaddy.autoapply.exception.AiServiceException;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import io.github.resilience4j.retry.annotation.Retry;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.reactive.function.client.WebClient;

public class CerebrasAiProvider extends OpenAiCompatibleProvider {

    private static final Logger log = LoggerFactory.getLogger(CerebrasAiProvider.class);

    private final String providerName;

    public CerebrasAiProvider(WebClient.Builder builder, String apiKey, String model, String providerName) {
        super(builder, "https://api.cerebras.ai", apiKey, model);
        this.providerName = providerName;
    }

    @Override
    public String getName() {
        return providerName;
    }

    @Override
    @CircuitBreaker(name = "cerebrasAi", fallbackMethod = "fallback")
    @Retry(name = "freeAi")
    public String generateText(String systemPrompt, String userPrompt) {
        return super.generateText(systemPrompt, userPrompt);
    }

    @SuppressWarnings("unused")
    private String fallback(String s, String u, Throwable t) {
        log.warn("Cerebras circuit open: {}", t.getMessage());
        throw new AiServiceException("Cerebras unavailable", t);
    }
}
