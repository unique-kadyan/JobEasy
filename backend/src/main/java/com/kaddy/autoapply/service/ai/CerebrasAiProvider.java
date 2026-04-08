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
public class CerebrasAiProvider extends OpenAiCompatibleProvider {

    private static final Logger log = LoggerFactory.getLogger(CerebrasAiProvider.class);

    public CerebrasAiProvider(
            WebClient.Builder builder,
            @Value("${app.ai.cerebras.api-key:}") String apiKey,
            @Value("${app.ai.cerebras.model:llama-3.3-70b}") String model) {
        super(builder, "https://api.cerebras.ai", apiKey, model);
    }

    @Override
    public String getName() { return "CEREBRAS"; }

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
