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
public class TogetherAiProvider extends OpenAiCompatibleProvider {

    private static final Logger log = LoggerFactory.getLogger(TogetherAiProvider.class);

    public TogetherAiProvider(
            WebClient.Builder builder,
            @Value("${app.ai.together.api-key:}") String apiKey,
            @Value("${app.ai.together.model:meta-llama/Llama-3.3-70B-Instruct-Turbo}") String model) {
        super(builder, "https://api.together.xyz", apiKey, model);
    }

    @Override
    public String getName() { return "TOGETHER"; }

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
