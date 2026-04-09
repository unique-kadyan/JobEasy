package com.kaddy.autoapply.service.ai;

/**
 * Sealed contract for all AI text-generation providers.
 *
 * <p>The closed {@code permits} set means the compiler can verify exhaustiveness
 * in pattern-matching switch expressions, and the JIT can apply optimal
 * de-virtualisation for the three direct branches:
 *
 * <ul>
 *   <li>{@link OpenAiCompatibleProvider} — abstract base for every provider that
 *       speaks the OpenAI {@code /v1/chat/completions} protocol (Cerebras, Groq,
 *       Together, Mistral, SambaNova, Novita, Gemini).</li>
 *   <li>{@link ClaudeAiProvider} — Anthropic's native Messages API.</li>
 *   <li>{@link OpenAiProvider} — OpenAI's own API (kept separate to allow
 *       different auth/retry tuning from the compatible variants).</li>
 * </ul>
 *
 * <p>Implementations are declared {@code non-sealed} so that Spring's CGLIB
 * proxy sub-classing (required for {@code @CircuitBreaker} / {@code @Retry} AOP)
 * continues to work without change.
 */
public sealed interface AiProvider
        permits OpenAiCompatibleProvider, ClaudeAiProvider, OpenAiProvider {

    /** Provider identifier used as a key in {@link AiProviderFactory}. */
    String getName();

    /**
     * Generates text from the given prompts.
     *
     * @param systemPrompt context / persona instructions
     * @param userPrompt   the task or question
     * @return generated text
     * @throws com.kaddy.autoapply.exception.AiServiceException on any failure
     */
    String generateText(String systemPrompt, String userPrompt);

    /**
     * Returns {@code true} when the provider is configured and ready to accept
     * requests (i.e., an API key is present and the circuit breaker is not OPEN).
     */
    boolean isAvailable();
}
