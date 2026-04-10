package com.kaddy.autoapply.service.ai;

import com.kaddy.autoapply.exception.AiServiceException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Component
public class AiProviderFactory {

    private static final Logger log = LoggerFactory.getLogger(AiProviderFactory.class);

    public record GenerationResult(String content, String providerName) {
    }

    public enum TaskType {
        RESUME_GENERATION(List.of(
                "CLAUDE", "OPENAI",
                "TOGETHER_DEEPSEEK_V3", "HYPERBOLIC_DEEPSEEK_V3", "DEEPSEEK",
                "TOGETHER_QWEN3_CODER", "HYPERBOLIC_QWEN3_CODER",
                "TOGETHER_KIMI_K2", "CEREBRAS_QWEN")),
        REASONING(List.of(
                "DEEPSEEK_R1",
                "HYPERBOLIC_DEEPSEEK_R1_0528", "HYPERBOLIC_DEEPSEEK_R1",
                "TOGETHER_DEEPSEEK_R1",
                "CLAUDE",
                "GROQ_COMPOUND", "GROQ_COMPOUND_MINI")),
        COVER_LETTER(List.of(
                "CLAUDE", "OPENAI",
                "DEEPSEEK", "TOGETHER_DEEPSEEK_V3",
                "TOGETHER_MISTRAL_SMALL", "MISTRAL")),
        FAST_TEXT(List.of(
                "GROQ", "GROQ_LLAMA_4_SCOUT",
                "CEREBRAS", "CEREBRAS_LLAMA_8B",
                "TOGETHER", "TOGETHER_LLAMA_8B")),
        GENERAL(List.of());

        private final List<String> preferredProviders;

        TaskType(List<String> preferredProviders) {
            this.preferredProviders = preferredProviders;
        }

        public List<String> preferredProviders() {
            return preferredProviders;
        }
    }

    private final Map<String, AiProvider> providerMap;
    private final List<String> freeProviderOrder;
    private final List<String> premiumProviderOrder;

    public AiProviderFactory(
            List<AiProvider> providers,
            @Value("${app.ai.provider-order.free:CEREBRAS,GROQ,TOGETHER,MISTRAL,SAMBANOVA,NOVITA}") String freeOrder,
            @Value("${app.ai.provider-order.premium:GEMINI,OPENAI,CLAUDE}") String premiumOrder) {
        this.providerMap = new HashMap<>();
        providers.forEach(p -> providerMap.put(p.getName().toUpperCase(), p));
        this.freeProviderOrder = Arrays.stream(freeOrder.split(","))
                .map(String::trim).map(String::toUpperCase).toList();
        this.premiumProviderOrder = Arrays.stream(premiumOrder.split(","))
                .map(String::trim).map(String::toUpperCase).toList();
        log.info("AI provider order — free: {}, premium: {}", freeProviderOrder, premiumProviderOrder);
    }

    public GenerationResult generate(String systemPrompt, String userPrompt, TaskType taskType) {
        if (taskType != null && taskType != TaskType.GENERAL) {
            for (String name : taskType.preferredProviders()) {
                AiProvider p = providerMap.get(name);
                if (p == null || !p.isAvailable())
                    continue;
                try {
                    String content = p.generateText(systemPrompt, userPrompt);
                    log.info("AI generation succeeded — task={}, provider={}", taskType, p.getName());
                    return new GenerationResult(content, p.getName());
                } catch (AiServiceException e) {
                    log.warn("Task-preferred provider {} failed (task={}): {} — trying next",
                            p.getName(), taskType, e.getMessage());
                }
            }
            log.warn("All task-preferred providers exhausted for task={} — falling through cascade", taskType);
        }
        return generate(systemPrompt, userPrompt, (String) null);
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

        for (String name : freeProviderOrder) {
            AiProvider p = providerMap.get(name);
            if (p == null || !p.isAvailable())
                continue;
            try {
                String content = p.generateText(systemPrompt, userPrompt);
                log.info("AI generation succeeded with free provider: {}", p.getName());
                return new GenerationResult(content, p.getName());
            } catch (AiServiceException e) {
                log.warn("Free provider {} failed: {} — trying next", p.getName(), e.getMessage());
            }
        }

        log.warn("All free AI providers failed. Falling back to premium providers.");

        for (String name : premiumProviderOrder) {
            AiProvider p = providerMap.get(name);
            if (p == null || !p.isAvailable())
                continue;
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
                        "DEEPSEEK_API_KEY, HYPERBOLIC_API_KEY, MISTRAL_API_KEY, " +
                        "SAMBANOVA_API_KEY, NOVITA_API_KEY, GEMINI_API_KEY, OPENAI_API_KEY, ANTHROPIC_API_KEY.");
    }
}
