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
public class SambanovaAiProvider extends OpenAiCompatibleProvider {

    private static final Logger log = LoggerFactory.getLogger(SambanovaAiProvider.class);

    public SambanovaAiProvider(
            WebClient.Builder builder,
            @Value("${app.ai.sambanova.api-key:}") String apiKey,
            @Value("${app.ai.sambanova.model:Meta-Llama-3.3-70B-Instruct}") String model) {
        super(builder, "https://api.sambanova.ai", apiKey, model);
    }

    @Override
    public String getName() { return "SAMBANOVA"; }

    @Override
    @CircuitBreaker(name = "sambanovaAi", fallbackMethod = "fallback")
    @Retry(name = "freeAi")
    public String generateText(String systemPrompt, String userPrompt) {
        return super.generateText(systemPrompt, userPrompt);
    }

    @SuppressWarnings("unused")
    private String fallback(String s, String u, Throwable t) {
        log.warn("SambaNova circuit open: {}", t.getMessage());
        throw new AiServiceException("SambaNova unavailable", t);
    }
}
