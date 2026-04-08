package com.kaddy.autoapply.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.Optional;

@Document(collection = "password_reset_tokens")
public class PasswordResetToken {

    @Id
    private String id;

    @Indexed(unique = true)
    private String token;

    @Indexed
    private String userId;

    private boolean used;
    private LocalDateTime createdAt;
    private LocalDateTime expiresAt;

    public PasswordResetToken() {
        this.used = false;
        this.createdAt = LocalDateTime.now();
        this.expiresAt = LocalDateTime.now().plusHours(1);
    }

    public PasswordResetToken(String id, String token, String userId,
                              boolean used, LocalDateTime createdAt, LocalDateTime expiresAt) {
        this.id = id;
        this.token = token;
        this.userId = userId;
        this.used = used;
        this.createdAt = createdAt;
        this.expiresAt = expiresAt;
    }

    public String getId() { return id; }
    public String getToken() { return token; }
    public String getUserId() { return userId; }
    public boolean isUsed() { return used; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getExpiresAt() { return expiresAt; }

    public void setId(String id) { this.id = id; }
    public void setToken(String token) { this.token = token; }
    public void setUserId(String userId) { this.userId = userId; }
    public void setUsed(boolean used) { this.used = used; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public void setExpiresAt(LocalDateTime expiresAt) { this.expiresAt = expiresAt; }

    public static Builder builder() {
        return new Builder();
    }

    public static final class Builder {

        private String id;
        private String token;
        private String userId;
        private boolean used = false;
        private LocalDateTime createdAt;
        private LocalDateTime expiresAt;

        private Builder() {}

        public Builder id(String id) { this.id = id; return this; }
        public Builder token(String token) { this.token = token; return this; }
        public Builder userId(String userId) { this.userId = userId; return this; }
        public Builder used(boolean used) { this.used = used; return this; }
        public Builder createdAt(LocalDateTime createdAt) { this.createdAt = createdAt; return this; }
        public Builder expiresAt(LocalDateTime expiresAt) { this.expiresAt = expiresAt; return this; }

        public PasswordResetToken build() {
            PasswordResetToken prt = new PasswordResetToken();
            prt.id = this.id;
            prt.token = this.token;
            prt.userId = this.userId;
            prt.used = this.used;
            prt.createdAt = Optional.ofNullable(this.createdAt).orElseGet(LocalDateTime::now);
            prt.expiresAt = Optional.ofNullable(this.expiresAt).orElseGet(() -> LocalDateTime.now().plusHours(1));
            return prt;
        }
    }
}
