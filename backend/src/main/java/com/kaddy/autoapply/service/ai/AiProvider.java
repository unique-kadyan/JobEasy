package com.kaddy.autoapply.service.ai;

public interface AiProvider {
    String getName();
    String generateText(String systemPrompt, String userPrompt);
    boolean isAvailable();
}
