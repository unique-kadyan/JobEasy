package com.kaddy.autoapply.service.ai;

import com.kaddy.autoapply.exception.AiServiceException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Component
public class AiProviderFactory {

    private static final Logger log = LoggerFactory.getLogger(AiProviderFactory.class);

    private static final List<String> FREE_PROVIDERS = List.of(
            "CEREBRAS", "GROQ", "TOGETHER", "MISTRAL", "SAMBANOVA", "NOVITA"
    );

    private static final List<String> PREMIUM_PROVIDERS = List.of(
            "GEMINI", "OPENAI", "CLAUDE"
    );

    public record GenerationResult(String content, String providerName) {}

    private final Map<String, AiProvider> providerMap;

    public AiProviderFactory(List<AiProvider> providers) {
        this.providerMap = new HashMap<>();
        providers.forEach(p -> providerMap.put(p.getName().toUpperCase(), p));
    }

    public GenerationResult generate(String systemPrompt, String userPrompt, String preferred) {

        if (preferred != null && !preferred.isBlank()) {
            AiProvider p = providerMap.get(preferred.toUpperCase());
            if (p != null && p.isAvailable()) {
                try {
                    String content = p.generateText(systemPrompt, userPrompt);
                    log.info("AI generation succeeded with preferred provider: {}", p.getName());
                    return new GenerationResult(content, p.getName());
                } catch (AiServiceException e) {
                    log.warn("Preferred provider {} failed: {} — falling through chain",
                            p.getName(), e.getMessage());
                }
            } else {
                log.debug("Preferred provider '{}' not configured, skipping", preferred);
            }
        }

        for (String name : FREE_PROVIDERS) {
            AiProvider p = providerMap.get(name);
            if (p == null || !p.isAvailable()) continue;
            try {
                String content = p.generateText(systemPrompt, userPrompt);
                log.info("AI generation succeeded with free provider: {}", p.getName());
                return new GenerationResult(content, p.getName());
            } catch (AiServiceException e) {
                log.warn("Free provider {} failed: {} — trying next", p.getName(), e.getMessage());
            }
        }

        log.warn("All free AI providers failed. Falling back to premium providers.");

        for (String name : PREMIUM_PROVIDERS) {
            AiProvider p = providerMap.get(name);
            if (p == null || !p.isAvailable()) continue;
            try {
                String content = p.generateText(systemPrompt, userPrompt);
                log.info("AI generation succeeded with premium provider: {}", p.getName());
                return new GenerationResult(content, p.getName());
            } catch (AiServiceException e) {
                log.warn("Premium provider {} failed: {} — trying next", p.getName(), e.getMessage());
            }
        }

        throw new AiServiceException(
                "All AI providers are currently unavailable. " +
                "Configure at least one of: CEREBRAS_API_KEY, GROQ_API_KEY, TOGETHER_API_KEY, " +
                "MISTRAL_API_KEY, SAMBANOVA_API_KEY, NOVITA_API_KEY, GEMINI_API_KEY, OPENAI_API_KEY."
        );
    }
}
