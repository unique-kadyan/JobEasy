package com.kaddy.autoapply.config.security;

import org.owasp.html.PolicyFactory;
import org.owasp.html.Sanitizers;
import org.springframework.stereotype.Component;

/**
 * OWASP HTML sanitizer to prevent XSS (OWASP A03:2021).
 */
@Component
public class InputSanitizer {

    private static final PolicyFactory FORMATTING_POLICY = Sanitizers.FORMATTING
            .and(Sanitizers.BLOCKS)
            .and(Sanitizers.LINKS);

    /**
     * Strict sanitization — strips ALL HTML tags.
     */
    public String sanitize(String input) {
        if (input == null) return null;
        return input.replaceAll("<[^>]*>", "").replaceAll("[&<>\"']", "").trim();
    }

    /**
     * Lenient sanitization — allows basic formatting (bold, italic, links).
     */
    public String sanitizeAllowFormatting(String input) {
        if (input == null) return null;
        return FORMATTING_POLICY.sanitize(input).trim();
    }
}
