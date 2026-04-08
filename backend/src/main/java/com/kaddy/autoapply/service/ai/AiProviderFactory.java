package com.kaddy.autoapply.service.ai;

import com.kaddy.autoapply.exception.AiServiceException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Resolves and invokes AI providers with a strict priority-based fallback chain.
 *
 * Execution order (free first — premium only when ALL free providers fail):
 *   1. CEREBRAS   — free tier
 *   2. GROQ        — free tier
 *   3. TOGETHER    — free tier
 *   4. MISTRAL     — free tier
 *   5. SAMBANOVA   — free tier
 *   6. NOVITA      — free tier
 *   ── premium gate — only crossed when every provider above has failed ──────────
 *   7. GEMINI      — generous free quota, but still metered
 *   8. OPENAI      — paid, last resort
 *   9. CLAUDE      — paid, last resort
 *
 * A provider is skipped when its API key is absent OR its Resilience4j circuit
 * breaker is OPEN (the fallback method re-throws AiServiceException, which this
 * class catches and uses to advance to the next candidate).
 */
@Component
public class AiProviderFactory {

    private static final Logger log = LoggerFactory.getLogger(AiProviderFactory.class);

    /** Ordered list of free providers. Tried first, in sequence. */
    private static final List<String> FREE_PROVIDERS = List.of(
            "CEREBRAS", "GROQ", "TOGETHER", "MISTRAL", "SAMBANOVA", "NOVITA"
    );

    /** Premium providers. Tried only when every free provider has failed. */
    private static final List<String> PREMIUM_PROVIDERS = List.of(
            "GEMINI", "OPENAI", "CLAUDE"
    );

    /** Result returned by {@link #generate} — carries the content and the winning provider name. */
    public record GenerationResult(String content, String providerName) {}

    private final Map<String, AiProvider> providerMap;

    public AiProviderFactory(List<AiProvider> providers) {
        this.providerMap = new HashMap<>();
        providers.forEach(p -> providerMap.put(p.getName().toUpperCase(), p));
    }

    /**
     * Generates text using the best available provider.
     *
     * <p>If {@code preferred} names a configured provider, it is tried first.
     * On failure the chain falls through all free providers, then (only if
     * necessary) through premium providers.  The first successful response wins.
     *
     * @param systemPrompt the system/context prompt
     * @param userPrompt   the user message / task prompt
     * @param preferred    optional provider name requested by the caller (may be null)
     * @return {@link GenerationResult} with the generated text and the provider that produced it
     * @throws AiServiceException if every configured provider fails
     */
    public GenerationResult generate(String systemPrompt, String userPrompt, String preferred) {

        // 1. Honour explicit caller preference first
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

        // 2. Try all free providers in order
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

        // 3. All free providers exhausted — escalate to premium (last resort)
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
