package com.kaddy.autoapply.config;

import com.kaddy.autoapply.service.ai.TogetherAiProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.reactive.function.client.WebClient;

@Configuration
public class TogetherConfig {

    @Value("${app.ai.together.api-key:}")
    private String apiKey;

    // Disabled — Together DeepSeek R1 returns 402, DeepSeek V3 returns 404 (model renamed/removed).
    // To re-enable: set app.ai.together.deepseek.enabled=true (and verify model names first)
    @Bean
    @ConditionalOnProperty(name = "app.ai.together.deepseek.enabled", havingValue = "true", matchIfMissing = false)
    TogetherAiProvider togetherDeepSeekR1(WebClient.Builder builder,
            @Value("${app.ai.together.model.deepseek-r1:deepseek-ai/DeepSeek-R1-0528}") String model) {
        return new TogetherAiProvider(builder, apiKey, model, "TOGETHER_DEEPSEEK_R1");
    }

    @Bean
    @ConditionalOnProperty(name = "app.ai.together.deepseek.enabled", havingValue = "true", matchIfMissing = false)
    TogetherAiProvider togetherDeepSeekV3(WebClient.Builder builder,
            @Value("${app.ai.together.model.deepseek-v3:deepseek-ai/DeepSeek-V3-1}") String model) {
        return new TogetherAiProvider(builder, apiKey, model, "TOGETHER_DEEPSEEK_V3");
    }

    @Bean
    TogetherAiProvider together(WebClient.Builder builder,
            @Value("${app.ai.together.model:meta-llama/Llama-3.3-70B-Instruct-Turbo}") String model) {
        return new TogetherAiProvider(builder, apiKey, model, "TOGETHER");
    }

    @Bean
    TogetherAiProvider togetherQwen35_397b(WebClient.Builder builder,
            @Value("${app.ai.together.model.qwen35-397b:Qwen/Qwen3.5-397B-A17B-FP8}") String model) {
        return new TogetherAiProvider(builder, apiKey, model, "TOGETHER_QWEN35_397B");
    }

    @Bean
    TogetherAiProvider togetherQwen35_9b(WebClient.Builder builder,
            @Value("${app.ai.together.model.qwen35-9b:Qwen/Qwen3.5-9B-FP8}") String model) {
        return new TogetherAiProvider(builder, apiKey, model, "TOGETHER_QWEN35_9B");
    }

    @Bean
    TogetherAiProvider togetherQwen3Coder(WebClient.Builder builder,
            @Value("${app.ai.together.model.qwen3-coder:Qwen/Qwen3-Coder-480B-A35B-Instruct-FP8}") String model) {
        return new TogetherAiProvider(builder, apiKey, model, "TOGETHER_QWEN3_CODER");
    }

    @Bean
    TogetherAiProvider togetherGlm51(WebClient.Builder builder,
            @Value("${app.ai.together.model.glm51:THUDM/GLM-5.1-FP4}") String model) {
        return new TogetherAiProvider(builder, apiKey, model, "TOGETHER_GLM51");
    }

    @Bean
    TogetherAiProvider togetherKimiK2(WebClient.Builder builder,
            @Value("${app.ai.together.model.kimi-k2:moonshotai/Kimi-K2.5}") String model) {
        return new TogetherAiProvider(builder, apiKey, model, "TOGETHER_KIMI_K2");
    }

    @Bean
    TogetherAiProvider togetherGptOss120b(WebClient.Builder builder,
            @Value("${app.ai.together.model.gpt-oss-120b:openai/gpt-oss-120b}") String model) {
        return new TogetherAiProvider(builder, apiKey, model, "TOGETHER_GPT_OSS_120B");
    }

    @Bean
    TogetherAiProvider togetherGptOss20b(WebClient.Builder builder,
            @Value("${app.ai.together.model.gpt-oss-20b:openai/gpt-oss-20b}") String model) {
        return new TogetherAiProvider(builder, apiKey, model, "TOGETHER_GPT_OSS_20B");
    }

    @Bean
    TogetherAiProvider togetherMistralSmall(WebClient.Builder builder,
            @Value("${app.ai.together.model.mistral-small:mistralai/Mistral-Small-24B-Instruct-2501}") String model) {
        return new TogetherAiProvider(builder, apiKey, model, "TOGETHER_MISTRAL_SMALL");
    }

    @Bean
    TogetherAiProvider togetherMixtral(WebClient.Builder builder,
            @Value("${app.ai.together.model.mixtral:mistralai/Mixtral-8x7B-Instruct-v0.1}") String model) {
        return new TogetherAiProvider(builder, apiKey, model, "TOGETHER_MIXTRAL");
    }

    @Bean
    TogetherAiProvider togetherLlama8b(WebClient.Builder builder,
            @Value("${app.ai.together.model.llama-8b:meta-llama/Meta-Llama-3-8B-Instruct-Lite}") String model) {
        return new TogetherAiProvider(builder, apiKey, model, "TOGETHER_LLAMA_8B");
    }

    @Bean
    TogetherAiProvider togetherCogito(WebClient.Builder builder,
            @Value("${app.ai.together.model.cogito:deepcogito/cogito-v2-1-671b}") String model) {
        return new TogetherAiProvider(builder, apiKey, model, "TOGETHER_COGITO");
    }
}
