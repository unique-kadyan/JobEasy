package com.kaddy.autoapply.config;

import com.kaddy.autoapply.service.ai.DeepSeekAiProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.reactive.function.client.WebClient;

// Disabled by default — API returns 402 (no credits).
// To re-enable: set app.ai.deepseek.enabled=true in application.properties
@Configuration
public class DeepSeekConfig {

    @Value("${app.ai.deepseek.api-key:}")
    private String apiKey;

    @Bean
    @ConditionalOnProperty(name = "app.ai.deepseek.enabled", havingValue = "true", matchIfMissing = false)
    DeepSeekAiProvider deepseek(WebClient.Builder builder,
            @Value("${app.ai.deepseek.model:deepseek-chat}") String model) {
        return new DeepSeekAiProvider(builder, apiKey, model, "DEEPSEEK");
    }

    @Bean
    @ConditionalOnProperty(name = "app.ai.deepseek.enabled", havingValue = "true", matchIfMissing = false)
    DeepSeekAiProvider deepseekR1(WebClient.Builder builder,
            @Value("${app.ai.deepseek.model.r1:deepseek-reasoner}") String model) {
        return new DeepSeekAiProvider(builder, apiKey, model, "DEEPSEEK_R1");
    }
}
