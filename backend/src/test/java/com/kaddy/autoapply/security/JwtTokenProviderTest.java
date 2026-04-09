package com.kaddy.autoapply.security;

import com.kaddy.autoapply.model.enums.Role;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class JwtTokenProviderTest {

    private JwtTokenProvider provider;

    @BeforeEach
    void setUp() {
        provider = new JwtTokenProvider(
                "test-secret-key-that-is-at-least-256-bits-long-for-hmac-sha256-signing-algorithm-here",
                900000, 604800000
        );
    }

    @Test
    void shouldGenerateAndValidateAccessToken() {
        String token = provider.generateAccessToken("user123", "test@example.com", List.of(Role.ROLE_USER));

        assertNotNull(token);
        assertTrue(provider.validateToken(token));
        assertTrue(provider.isAccessToken(token));
        assertEquals("user123", provider.getUserIdFromToken(token));
        assertEquals("test@example.com", provider.getEmailFromToken(token));
    }

    @Test
    void shouldGenerateRefreshToken() {
        String token = provider.generateRefreshToken("user123", "test@example.com", List.of(Role.ROLE_USER));

        assertNotNull(token);
        assertTrue(provider.validateToken(token));
        assertFalse(provider.isAccessToken(token));
    }

    @Test
    void shouldRejectInvalidToken() {
        assertFalse(provider.validateToken("invalid.token.here"));
        assertFalse(provider.validateToken(null));
        assertFalse(provider.validateToken(""));
    }

    @Test
    void shouldRejectTamperedToken() {
        String token = provider.generateAccessToken("user1", "a@b.com", List.of(Role.ROLE_USER));
        String tampered = token.substring(0, token.length() - 5) + "XXXXX";
        assertFalse(provider.validateToken(tampered));
    }
}
