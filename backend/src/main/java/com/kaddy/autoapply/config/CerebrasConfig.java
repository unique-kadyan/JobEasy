package com.kaddy.autoapply.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.reactive.function.client.WebClient;

import com.kaddy.autoapply.service.ai.CerebrasAiProvider;

@Configuration
public class CerebrasConfig {

    @Value("${app.ai.cerebras.api-key:}")
    private String apiKey;

    @Bean
    CerebrasAiProvider cerebras(WebClient.Builder builder,
            @Value("${app.ai.cerebras.model:llama-3.3-70b}") String model) {
        return new CerebrasAiProvider(builder, apiKey, model, "CEREBRAS");
    }

    @Bean
    CerebrasAiProvider cerebrasQwen(WebClient.Builder builder,
            @Value("${app.ai.cerebras.model.qwen:qwen-3-32b}") String model) {
        return new CerebrasAiProvider(builder, apiKey, model, "CEREBRAS_QWEN");
    }

    @Bean
    CerebrasAiProvider cerebrasGptOss(WebClient.Builder builder,
            @Value("${app.ai.cerebras.model.gpt-oss:gpt-4o-mini}") String model) {
        return new CerebrasAiProvider(builder, apiKey, model, "CEREBRAS_GPT_OSS");
    }

    @Bean
    CerebrasAiProvider cerebrasGlm(WebClient.Builder builder,
            @Value("${app.ai.cerebras.model.glm:glm-4-32b}") String model) {
        return new CerebrasAiProvider(builder, apiKey, model, "CEREBRAS_GLM");
    }

    @Bean
    CerebrasAiProvider cerebrasLlama8b(WebClient.Builder builder,
            @Value("${app.ai.cerebras.model.llama-8b:llama3.1-8b}") String model) {
        return new CerebrasAiProvider(builder, apiKey, model, "CEREBRAS_LLAMA_8B");
    }
}
