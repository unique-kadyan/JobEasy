package com.kaddy.autoapply.config.security;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class InputSanitizerTest {

    private final InputSanitizer sanitizer = new InputSanitizer();

    @Test
    void sanitize_shouldStripHtmlTags() {
        assertEquals("alert(xss)", sanitizer.sanitize("<script>alert('xss')</script>"));
    }

    @Test
    void sanitize_shouldStripSpecialChars() {
        String result = sanitizer.sanitize("Hello <b>World</b> & \"test\"");
        assertFalse(result.contains("<"));
        assertFalse(result.contains(">"));
        assertFalse(result.contains("&"));
        assertFalse(result.contains("\""));
    }

    @Test
    void sanitize_shouldHandleNull() {
        assertNull(sanitizer.sanitize(null));
    }

    @Test
    void sanitize_shouldTrim() {
        assertEquals("hello", sanitizer.sanitize("  hello  "));
    }

    @Test
    void sanitizeAllowFormatting_shouldAllowBasicHtml() {
        String result = sanitizer.sanitizeAllowFormatting("<b>bold</b> and <i>italic</i>");
        assertTrue(result.contains("<b>"));
        assertTrue(result.contains("<i>"));
    }

    @Test
    void sanitizeAllowFormatting_shouldStripScriptTags() {
        String result = sanitizer.sanitizeAllowFormatting("<script>alert('xss')</script> safe text");
        assertFalse(result.contains("<script>"));
        assertTrue(result.contains("safe text"));
    }

    @Test
    void sanitizeAllowFormatting_shouldHandleNull() {
        assertNull(sanitizer.sanitizeAllowFormatting(null));
    }
}
