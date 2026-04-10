package com.kaddy.autoapply.config;

import com.kaddy.autoapply.service.ai.AiProviderFactory;
import com.kaddy.autoapply.service.ai.AiTextGenerator;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class AiConfig {

    @Bean
    AiTextGenerator aiTextGenerator(AiProviderFactory factory) {
        return (systemPrompt, userPrompt) ->
                factory.generate(systemPrompt, userPrompt, (String) null).content();
    }
}
