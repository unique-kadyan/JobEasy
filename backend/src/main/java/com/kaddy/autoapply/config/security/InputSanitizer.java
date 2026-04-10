package com.kaddy.autoapply.config.security;

import org.owasp.html.PolicyFactory;
import org.owasp.html.Sanitizers;
import org.springframework.stereotype.Component;

@Component
public class InputSanitizer {

    private static final PolicyFactory FORMATTING_POLICY = Sanitizers.FORMATTING
            .and(Sanitizers.BLOCKS)
            .and(Sanitizers.LINKS);

    public String sanitize(String input) {
        if (input == null) return null;
        return input.replaceAll("<[^>]*>", "").replaceAll("[&<>\"']", "").trim();
    }

    public String sanitizeAllowFormatting(String input) {
        if (input == null) return null;
        return FORMATTING_POLICY.sanitize(input).trim();
    }
}
