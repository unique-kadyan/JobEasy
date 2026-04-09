package com.kaddy.autoapply.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

/**
 * Immutable password-reset token.
 *
 * <p>The only post-creation state change — marking the token used — is expressed
 * as {@link #markUsed()}, which returns a <em>new</em> record instance rather than
 * mutating this one, consistent with the record's value-object semantics.
 *
 * <p>Use {@link #create} to build a fresh token with a 1-hour TTL.
 */
@Document(collection = "password_reset_tokens")
public record PasswordResetToken(
        @Id                   String        id,
        @Indexed(unique=true) String        token,
        @Indexed              String        userId,
        boolean               used,
        LocalDateTime         createdAt,
        LocalDateTime         expiresAt
) {
    /** Compact constructor — guards against null timestamps. Spring Data uses this automatically. */
    public PasswordResetToken {
        if (createdAt == null) createdAt = LocalDateTime.now();
        if (expiresAt == null) expiresAt = createdAt.plusHours(1);
    }

    /**
     * Factory for a fresh, unused token expiring 1 hour from now.
     * {@code id} is {@code null} so MongoDB assigns the ObjectId on save.
     */
    public static PasswordResetToken create(String token, String userId) {
        LocalDateTime now = LocalDateTime.now();
        return new PasswordResetToken(null, token, userId, false, now, now.plusHours(1));
    }

    /**
     * Returns a new instance with {@code used = true}.
     * Caller must persist the returned value — this instance is unchanged.
     */
    public PasswordResetToken markUsed() {
        return new PasswordResetToken(id, token, userId, true, createdAt, expiresAt);
    }

    /** Returns {@code true} when the token's validity window has closed. */
    public boolean isExpired() {
        return LocalDateTime.now().isAfter(expiresAt);
    }
}
