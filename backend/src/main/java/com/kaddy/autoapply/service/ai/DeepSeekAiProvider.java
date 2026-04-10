package com.kaddy.autoapply.service.ai;

import com.kaddy.autoapply.exception.AiServiceException;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import io.github.resilience4j.retry.annotation.Retry;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.reactive.function.client.WebClient;

public class DeepSeekAiProvider extends OpenAiCompatibleProvider {

    private static final Logger log = LoggerFactory.getLogger(DeepSeekAiProvider.class);

    private final String providerName;

    public DeepSeekAiProvider(WebClient.Builder builder, String apiKey, String model, String providerName) {
        super(builder, "https://api.deepseek.com", apiKey, model);
        this.providerName = providerName;
    }

    @Override
    public String getName() {
        return providerName;
    }

    @Override
    @CircuitBreaker(name = "deepseekAi", fallbackMethod = "fallback")
    @Retry(name = "freeAi")
    public String generateText(String systemPrompt, String userPrompt) {
        return super.generateText(systemPrompt, userPrompt);
    }

    @SuppressWarnings("unused")
    private String fallback(String s, String u, Throwable t) {
        log.warn("DeepSeek circuit open: {}", t.getMessage());
        throw new AiServiceException("DeepSeek unavailable", t);
    }
}
