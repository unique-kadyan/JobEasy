package com.kaddy.autoapply.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Document(collection = "password_reset_tokens")
public record PasswordResetToken(
        @Id                   String        id,
        @Indexed(unique=true) String        token,
        @Indexed              String        userId,
        boolean               used,
        LocalDateTime         createdAt,
        LocalDateTime         expiresAt
) {

    public PasswordResetToken {
        if (createdAt == null) createdAt = LocalDateTime.now();
        if (expiresAt == null) expiresAt = createdAt.plusHours(1);
    }

    public static PasswordResetToken create(String token, String userId) {
        LocalDateTime now = LocalDateTime.now();
        return new PasswordResetToken(null, token, userId, false, now, now.plusHours(1));
    }

    public PasswordResetToken markUsed() {
        return new PasswordResetToken(id, token, userId, true, createdAt, expiresAt);
    }

    public boolean isExpired() {
        return LocalDateTime.now().isAfter(expiresAt);
    }
}
