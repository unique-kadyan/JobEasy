package com.kaddy.autoapply.model;

import com.kaddy.autoapply.model.enums.AuthProvider;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.Map;

@Document(collection = "users")
public class User {

    @Id
    private String id;

    @Indexed(unique = true)
    private String email;

    private String passwordHash;
    private String name;
    private String phone;
    private String location;
    private String title;
    private String summary;
    private Map<String, Object> skills;
    private AuthProvider authProvider;
    private boolean emailVerified;
    private String oauthId;
    private String avatarUrl;
    private Map<String, Object> preferences;
    private String linkedinUrl;
    private String githubUrl;
    private String portfolioUrl;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public User() {
        this.authProvider = AuthProvider.LOCAL;
        this.emailVerified = false;
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    public User(String id, String email, String passwordHash, String name, String phone,
                String location, String title, String summary, Map<String, Object> skills,
                AuthProvider authProvider, boolean emailVerified, String oauthId,
                String avatarUrl, Map<String, Object> preferences,
                LocalDateTime createdAt, LocalDateTime updatedAt) {
        this.id = id;
        this.email = email;
        this.passwordHash = passwordHash;
        this.name = name;
        this.phone = phone;
        this.location = location;
        this.title = title;
        this.summary = summary;
        this.skills = skills;
        this.authProvider = authProvider;
        this.emailVerified = emailVerified;
        this.oauthId = oauthId;
        this.avatarUrl = avatarUrl;
        this.preferences = preferences;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    public String getId() { return id; }
    public String getEmail() { return email; }
    public String getPasswordHash() { return passwordHash; }
    public String getName() { return name; }
    public String getPhone() { return phone; }
    public String getLocation() { return location; }
    public String getTitle() { return title; }
    public String getSummary() { return summary; }
    public Map<String, Object> getSkills() { return skills; }
    public AuthProvider getAuthProvider() { return authProvider; }
    public boolean isEmailVerified() { return emailVerified; }
    public String getOauthId() { return oauthId; }
    public String getAvatarUrl() { return avatarUrl; }
    public Map<String, Object> getPreferences() { return preferences; }
    public String getLinkedinUrl() { return linkedinUrl; }
    public String getGithubUrl() { return githubUrl; }
    public String getPortfolioUrl() { return portfolioUrl; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }

    public void setId(String id) { this.id = id; }
    public void setEmail(String email) { this.email = email; }
    public void setPasswordHash(String passwordHash) { this.passwordHash = passwordHash; }
    public void setName(String name) { this.name = name; }
    public void setPhone(String phone) { this.phone = phone; }
    public void setLocation(String location) { this.location = location; }
    public void setTitle(String title) { this.title = title; }
    public void setSummary(String summary) { this.summary = summary; }
    public void setSkills(Map<String, Object> skills) { this.skills = skills; }
    public void setAuthProvider(AuthProvider authProvider) { this.authProvider = authProvider; }
    public void setEmailVerified(boolean emailVerified) { this.emailVerified = emailVerified; }
    public void setOauthId(String oauthId) { this.oauthId = oauthId; }
    public void setAvatarUrl(String avatarUrl) { this.avatarUrl = avatarUrl; }
    public void setPreferences(Map<String, Object> preferences) { this.preferences = preferences; }
    public void setLinkedinUrl(String linkedinUrl) { this.linkedinUrl = linkedinUrl; }
    public void setGithubUrl(String githubUrl) { this.githubUrl = githubUrl; }
    public void setPortfolioUrl(String portfolioUrl) { this.portfolioUrl = portfolioUrl; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }

    public static Builder builder() {
        return new Builder();
    }

    public static final class Builder {

        private String id;
        private String email;
        private String passwordHash;
        private String name;
        private String phone;
        private String location;
        private String title;
        private String summary;
        private Map<String, Object> skills;
        private AuthProvider authProvider = AuthProvider.LOCAL;
        private boolean emailVerified = false;
        private String oauthId;
        private String avatarUrl;
        private Map<String, Object> preferences;
        private String linkedinUrl;
        private String githubUrl;
        private String portfolioUrl;
        private LocalDateTime createdAt;
        private LocalDateTime updatedAt;

        private Builder() {}

        public Builder id(String id) { this.id = id; return this; }
        public Builder email(String email) { this.email = email; return this; }
        public Builder passwordHash(String passwordHash) { this.passwordHash = passwordHash; return this; }
        public Builder name(String name) { this.name = name; return this; }
        public Builder phone(String phone) { this.phone = phone; return this; }
        public Builder location(String location) { this.location = location; return this; }
        public Builder title(String title) { this.title = title; return this; }
        public Builder summary(String summary) { this.summary = summary; return this; }
        public Builder skills(Map<String, Object> skills) { this.skills = skills; return this; }
        public Builder authProvider(AuthProvider authProvider) { this.authProvider = authProvider; return this; }
        public Builder emailVerified(boolean emailVerified) { this.emailVerified = emailVerified; return this; }
        public Builder oauthId(String oauthId) { this.oauthId = oauthId; return this; }
        public Builder avatarUrl(String avatarUrl) { this.avatarUrl = avatarUrl; return this; }
        public Builder preferences(Map<String, Object> preferences) { this.preferences = preferences; return this; }
        public Builder linkedinUrl(String linkedinUrl) { this.linkedinUrl = linkedinUrl; return this; }
        public Builder githubUrl(String githubUrl) { this.githubUrl = githubUrl; return this; }
        public Builder portfolioUrl(String portfolioUrl) { this.portfolioUrl = portfolioUrl; return this; }
        public Builder createdAt(LocalDateTime createdAt) { this.createdAt = createdAt; return this; }
        public Builder updatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; return this; }

        public User build() {
            User user = new User();
            user.id = this.id;
            user.email = this.email;
            user.passwordHash = this.passwordHash;
            user.name = this.name;
            user.phone = this.phone;
            user.location = this.location;
            user.title = this.title;
            user.summary = this.summary;
            user.skills = this.skills;
            user.authProvider = this.authProvider;
            user.emailVerified = this.emailVerified;
            user.oauthId = this.oauthId;
            user.avatarUrl = this.avatarUrl;
            user.preferences = this.preferences;
            user.linkedinUrl = this.linkedinUrl;
            user.githubUrl = this.githubUrl;
            user.portfolioUrl = this.portfolioUrl;
            user.createdAt = this.createdAt != null ? this.createdAt : LocalDateTime.now();
            user.updatedAt = this.updatedAt != null ? this.updatedAt : LocalDateTime.now();
            return user;
        }
    }
}
