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
public class GeminiAiProvider extends OpenAiCompatibleProvider {

    private static final Logger log = LoggerFactory.getLogger(GeminiAiProvider.class);

    public GeminiAiProvider(
            WebClient.Builder builder,
            @Value("${app.ai.gemini.api-key:}") String apiKey,
            @Value("${app.ai.gemini.model:gemini-2.0-flash}") String model) {
        super(builder, "https://generativelanguage.googleapis.com/v1beta/openai", apiKey, model);
    }

    @Override
    public String getName() { return "GEMINI"; }

    @Override
    @CircuitBreaker(name = "geminiAi", fallbackMethod = "fallback")
    @Retry(name = "premiumAi")
    public String generateText(String systemPrompt, String userPrompt) {
        return super.generateText(systemPrompt, userPrompt);
    }

    @SuppressWarnings("unused")
    private String fallback(String s, String u, Throwable t) {
        log.warn("Gemini circuit open: {}", t.getMessage());
        throw new AiServiceException("Gemini unavailable", t);
    }
}
