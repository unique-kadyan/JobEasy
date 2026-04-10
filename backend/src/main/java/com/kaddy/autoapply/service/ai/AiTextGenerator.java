package com.kaddy.autoapply.service.ai;

@FunctionalInterface
public interface AiTextGenerator {
    String generate(String systemPrompt, String userPrompt);
}
