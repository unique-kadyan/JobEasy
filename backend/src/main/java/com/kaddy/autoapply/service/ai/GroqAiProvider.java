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
public class GroqAiProvider extends OpenAiCompatibleProvider {

    private static final Logger log = LoggerFactory.getLogger(GroqAiProvider.class);

    public GroqAiProvider(
            WebClient.Builder builder,
            @Value("${app.ai.groq.api-key:}") String apiKey,
            @Value("${app.ai.groq.model:llama-3.3-70b-versatile}") String model) {
        super(builder, "https://api.groq.com/openai", apiKey, model);
    }

    @Override
    public String getName() { return "GROQ"; }

    @Override
    @CircuitBreaker(name = "groqAi", fallbackMethod = "fallback")
    @Retry(name = "freeAi")
    public String generateText(String systemPrompt, String userPrompt) {
        return super.generateText(systemPrompt, userPrompt);
    }

    @SuppressWarnings("unused")
    private String fallback(String s, String u, Throwable t) {
        log.warn("Groq circuit open: {}", t.getMessage());
        throw new AiServiceException("Groq unavailable", t);
    }
}
