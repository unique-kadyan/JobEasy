package com.kaddy.autoapply.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.reactive.function.client.WebClient;

import com.kaddy.autoapply.service.ai.GroqAiProvider;

@Configuration
public class GroqConfig {

    @Value("${app.ai.groq.api-key:}")
    private String apiKey;

    @Bean
    GroqAiProvider groq(WebClient.Builder builder,
            @Value("${app.ai.groq.model:llama-3.3-70b-versatile}") String model) {
        return new GroqAiProvider(builder, apiKey, model, "GROQ");
    }

    @Bean
    GroqAiProvider groqLlama8b(WebClient.Builder builder,
            @Value("${app.ai.groq.model.llama-8b:llama-3.1-8b-instant}") String model) {
        return new GroqAiProvider(builder, apiKey, model, "GROQ_LLAMA_8B");
    }

    @Bean
    GroqAiProvider groqLlama4Scout(WebClient.Builder builder,
            @Value("${app.ai.groq.model.llama-4-scout:meta-llama/llama-4-scout-17b-16e-instruct}") String model) {
        return new GroqAiProvider(builder, apiKey, model, "GROQ_LLAMA_4_SCOUT");
    }

    @Bean
    GroqAiProvider groqCompound(WebClient.Builder builder,
            @Value("${app.ai.groq.model.compound:groq/compound}") String model) {
        return new GroqAiProvider(builder, apiKey, model, "GROQ_COMPOUND");
    }

    @Bean
    GroqAiProvider groqCompoundMini(WebClient.Builder builder,
            @Value("${app.ai.groq.model.compound-mini:groq/compound-mini}") String model) {
        return new GroqAiProvider(builder, apiKey, model, "GROQ_COMPOUND_MINI");
    }

    @Bean
    GroqAiProvider groqGptOss120b(WebClient.Builder builder,
            @Value("${app.ai.groq.model.gpt-oss-120b:openai/gpt-oss-120b}") String model) {
        return new GroqAiProvider(builder, apiKey, model, "GROQ_GPT_OSS_120B");
    }

    @Bean
    GroqAiProvider groqGptOss20b(WebClient.Builder builder,
            @Value("${app.ai.groq.model.gpt-oss-20b:openai/gpt-oss-20b}") String model) {
        return new GroqAiProvider(builder, apiKey, model, "GROQ_GPT_OSS_20B");
    }
}
