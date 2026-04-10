package com.kaddy.autoapply.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.reactive.function.client.WebClient;

import com.kaddy.autoapply.service.ai.DeepSeekAiProvider;

@Configuration
public class DeepSeekConfig {

    @Value("${app.ai.deepseek.api-key:}")
    private String apiKey;

    @Bean
    DeepSeekAiProvider deepseek(WebClient.Builder builder,
            @Value("${app.ai.deepseek.model:deepseek-chat}") String model) {
        return new DeepSeekAiProvider(builder, apiKey, model, "DEEPSEEK");
    }

    @Bean
    DeepSeekAiProvider deepseekR1(WebClient.Builder builder,
            @Value("${app.ai.deepseek.model.r1:deepseek-reasoner}") String model) {
        return new DeepSeekAiProvider(builder, apiKey, model, "DEEPSEEK_R1");
    }
}
