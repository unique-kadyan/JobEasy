package com.kaddy.autoapply.config;

import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.springframework.boot.autoconfigure.jackson.Jackson2ObjectMapperBuilderCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Ensures JavaTimeModule is registered on the primary Spring MVC ObjectMapper
 * so LocalDateTime fields serialize as ISO-8601 strings in HTTP responses.
 *
 * Spring Boot auto-config normally handles this, but the explicit jackson-databind
 * version declaration in pom.xml can prevent the module from being auto-detected.
 */
@Configuration
public class JacksonConfig {

    @Bean
    Jackson2ObjectMapperBuilderCustomizer javaTimeModuleCustomizer() {
        return builder -> builder
                .modules(new JavaTimeModule())
                .featuresToDisable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
    }
}
