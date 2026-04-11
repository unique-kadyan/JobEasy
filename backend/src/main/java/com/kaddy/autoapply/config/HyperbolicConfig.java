package com.kaddy.autoapply.config;

import com.kaddy.autoapply.service.ai.HyperbolicAiProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.reactive.function.client.WebClient;

@Configuration
public class HyperbolicConfig {

    @Value("${app.ai.hyperbolic.api-key:}")
    private String apiKey;

    @Bean
    HyperbolicAiProvider hyperbolic(WebClient.Builder builder,
            @Value("${app.ai.hyperbolic.model:meta-llama/Llama-3.3-70B-Instruct}") String model) {
        return new HyperbolicAiProvider(builder, apiKey, model, "HYPERBOLIC");
    }

    // Disabled — DeepSeek R1 on Hyperbolic returns 402 (paid tier required).
    // To re-enable: set app.ai.hyperbolic.deepseek.enabled=true
    @Bean
    @ConditionalOnProperty(name = "app.ai.hyperbolic.deepseek.enabled", havingValue = "true", matchIfMissing = false)
    HyperbolicAiProvider hyperbolicDeepSeekR1(WebClient.Builder builder,
            @Value("${app.ai.hyperbolic.model.deepseek-r1:deepseek-ai/DeepSeek-R1}") String model) {
        return new HyperbolicAiProvider(builder, apiKey, model, "HYPERBOLIC_DEEPSEEK_R1");
    }

    @Bean
    @ConditionalOnProperty(name = "app.ai.hyperbolic.deepseek.enabled", havingValue = "true", matchIfMissing = false)
    HyperbolicAiProvider hyperbolicDeepSeekR1_0528(WebClient.Builder builder,
            @Value("${app.ai.hyperbolic.model.deepseek-r1-0528:deepseek-ai/DeepSeek-R1-0528}") String model) {
        return new HyperbolicAiProvider(builder, apiKey, model, "HYPERBOLIC_DEEPSEEK_R1_0528");
    }

    @Bean
    @ConditionalOnProperty(name = "app.ai.hyperbolic.deepseek.enabled", havingValue = "true", matchIfMissing = false)
    HyperbolicAiProvider hyperbolicDeepSeekV3(WebClient.Builder builder,
            @Value("${app.ai.hyperbolic.model.deepseek-v3:deepseek-ai/DeepSeek-V3-0324}") String model) {
        return new HyperbolicAiProvider(builder, apiKey, model, "HYPERBOLIC_DEEPSEEK_V3");
    }

    @Bean
    HyperbolicAiProvider hyperbolicQwen3Coder(WebClient.Builder builder,
            @Value("${app.ai.hyperbolic.model.qwen3-coder:Qwen/Qwen3-Coder-480B-A35B-Instruct}") String model) {
        return new HyperbolicAiProvider(builder, apiKey, model, "HYPERBOLIC_QWEN3_CODER");
    }
}
