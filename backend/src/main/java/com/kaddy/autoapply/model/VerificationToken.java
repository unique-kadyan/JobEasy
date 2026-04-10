package com.kaddy.autoapply.model;

import org.springframework.data.annotation.Id;

import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Document(collection = "verification_tokens")
public record VerificationToken(
        @Id                   String        id,
        @Indexed(unique=true) String        token,
        @Indexed              String        userId,
        LocalDateTime         createdAt,
        LocalDateTime         expiresAt
) {

    public VerificationToken {
        if (createdAt == null) createdAt = LocalDateTime.now();
        if (expiresAt == null) expiresAt = createdAt.plusHours(24);
    }

    public static VerificationToken create(String token, String userId) {
        LocalDateTime now = LocalDateTime.now();
        return new VerificationToken(null, token, userId, now, now.plusHours(24));
    }

    public boolean isExpired() {
        return LocalDateTime.now().isAfter(expiresAt);
    }
}
