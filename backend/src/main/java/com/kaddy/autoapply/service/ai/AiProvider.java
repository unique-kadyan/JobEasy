package com.kaddy.autoapply.service.ai;

public sealed interface AiProvider
        permits OpenAiCompatibleProvider, ClaudeAiProvider, OpenAiProvider {

    String getName();

    String generateText(String systemPrompt, String userPrompt);

    boolean isAvailable();
}
