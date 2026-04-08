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
public class NovitaAiProvider extends OpenAiCompatibleProvider {

    private static final Logger log = LoggerFactory.getLogger(NovitaAiProvider.class);

    public NovitaAiProvider(
            WebClient.Builder builder,
            @Value("${app.ai.novita.api-key:}") String apiKey,
            @Value("${app.ai.novita.model:meta-llama/llama-3.3-70b-instruct}") String model) {
        super(builder, "https://api.novita.ai/v3/openai", apiKey, model);
    }

    @Override
    public String getName() { return "NOVITA"; }

    @Override
    @CircuitBreaker(name = "novitaAi", fallbackMethod = "fallback")
    @Retry(name = "freeAi")
    public String generateText(String systemPrompt, String userPrompt) {
        return super.generateText(systemPrompt, userPrompt);
    }

    @SuppressWarnings("unused")
    private String fallback(String s, String u, Throwable t) {
        log.warn("Novita circuit open: {}", t.getMessage());
        throw new AiServiceException("Novita unavailable", t);
    }
}
