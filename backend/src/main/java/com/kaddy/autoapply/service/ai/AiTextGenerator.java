package com.kaddy.autoapply.service.ai;

/**
 * Functional interface for AI text generation.
 * Enables strategy pattern for swapping AI providers.
 */
@FunctionalInterface
public interface AiTextGenerator {
    String generate(String systemPrompt, String userPrompt);
}
