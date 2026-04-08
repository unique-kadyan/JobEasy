package com.kaddy.autoapply.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Document(collection = "verification_tokens")
public class VerificationToken {

    @Id
    private String id;

    @Indexed(unique = true)
    private String token;

    @Indexed
    private String userId;

    private LocalDateTime createdAt;
    private LocalDateTime expiresAt;

    public VerificationToken() {
        this.createdAt = LocalDateTime.now();
        this.expiresAt = LocalDateTime.now().plusHours(24);
    }

    public VerificationToken(String id, String token, String userId,
                             LocalDateTime createdAt, LocalDateTime expiresAt) {
        this.id = id;
        this.token = token;
        this.userId = userId;
        this.createdAt = createdAt;
        this.expiresAt = expiresAt;
    }

    public String getId() { return id; }
    public String getToken() { return token; }
    public String getUserId() { return userId; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getExpiresAt() { return expiresAt; }

    public void setId(String id) { this.id = id; }
    public void setToken(String token) { this.token = token; }
    public void setUserId(String userId) { this.userId = userId; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public void setExpiresAt(LocalDateTime expiresAt) { this.expiresAt = expiresAt; }

    public static Builder builder() {
        return new Builder();
    }

    public static final class Builder {

        private String id;
        private String token;
        private String userId;
        private LocalDateTime createdAt;
        private LocalDateTime expiresAt;

        private Builder() {}

        public Builder id(String id) { this.id = id; return this; }
        public Builder token(String token) { this.token = token; return this; }
        public Builder userId(String userId) { this.userId = userId; return this; }
        public Builder createdAt(LocalDateTime createdAt) { this.createdAt = createdAt; return this; }
        public Builder expiresAt(LocalDateTime expiresAt) { this.expiresAt = expiresAt; return this; }

        public VerificationToken build() {
            VerificationToken vt = new VerificationToken();
            vt.id = this.id;
            vt.token = this.token;
            vt.userId = this.userId;
            vt.createdAt = this.createdAt != null ? this.createdAt : LocalDateTime.now();
            vt.expiresAt = this.expiresAt != null ? this.expiresAt : LocalDateTime.now().plusHours(24);
            return vt;
        }
    }
}
