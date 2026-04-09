package com.kaddy.autoapply.model;

import org.springframework.data.annotation.Id;

import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

/**
 * Immutable one-time email-verification token.
 *
 * <p>Tokens are created once, read once (during verification), then deleted.
 * There is no mutable state, making a record the correct representation.
 *
 * <p>Use {@link #create} to build a token with a 24-hour TTL.
 */
@Document(collection = "verification_tokens")
public record VerificationToken(
        @Id                   String        id,
        @Indexed(unique=true) String        token,
        @Indexed              String        userId,
        LocalDateTime         createdAt,
        LocalDateTime         expiresAt
) {
    /** Compact constructor — guards against null timestamps. Spring Data uses this automatically. */
    public VerificationToken {
        if (createdAt == null) createdAt = LocalDateTime.now();
        if (expiresAt == null) expiresAt = createdAt.plusHours(24);
    }

    /**
     * Factory for a fresh token expiring 24 hours from now.
     * {@code id} is {@code null} so MongoDB assigns the ObjectId on save.
     */
    public static VerificationToken create(String token, String userId) {
        LocalDateTime now = LocalDateTime.now();
        return new VerificationToken(null, token, userId, now, now.plusHours(24));
    }

    /** Returns {@code true} when the token's validity window has closed. */
    public boolean isExpired() {
        return LocalDateTime.now().isAfter(expiresAt);
    }
}
