package com.kaddy.autoapply.model;

import com.kaddy.autoapply.model.enums.AuthProvider;
import com.kaddy.autoapply.model.enums.Role;
import com.kaddy.autoapply.model.enums.SubscriptionTier;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.EnumSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

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

    // ── Profile enrichment ────────────────────────────────────────────────────
    /** Years of professional experience (used for seniority scoring). */
    private int experienceYears;
    /** Job titles the user is actively targeting (boosts match score for these). */
    private List<String> targetRoles;

    // ── Smart filtering ───────────────────────────────────────────────────────
    /** User-defined reasons for marking a job as Not Interested (regex-matched). */
    private List<String> notInterestedReasons;
    /** Keywords derived from notInterestedReasons used to pre-filter search results. */
    private List<String> skipKeywords;

    // ── Auto-search schedule ──────────────────────────────────────────────────
    private boolean autoSearchEnabled;
    private int autoSearchIntervalHours;  // 1 | 2 | 4 | 6 | 12 | 24
    private Map<String, Object> autoSearchParams; // query, location, etc.
    private LocalDateTime autoSearchLastRun;

    /** Subscription tier — controls how many job results are shown and whether auto-apply is available. */
    private SubscriptionTier subscriptionTier;

    /** Roles carried in JWT claims. Every account receives {@link Role#ROLE_USER} at signup. */
    private Set<Role> roles;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public User() {
        this.authProvider = AuthProvider.LOCAL;
        this.emailVerified = false;
        this.autoSearchEnabled = false;
        this.autoSearchIntervalHours = 24;
        this.roles = EnumSet.of(Role.ROLE_USER);
        this.subscriptionTier = SubscriptionTier.FREE;
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    // ── Getters ───────────────────────────────────────────────────────────────

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
    public int getExperienceYears() { return experienceYears; }
    public List<String> getTargetRoles() { return targetRoles; }
    public List<String> getNotInterestedReasons() { return notInterestedReasons; }
    public List<String> getSkipKeywords() { return skipKeywords; }
    public boolean isAutoSearchEnabled() { return autoSearchEnabled; }
    public int getAutoSearchIntervalHours() { return autoSearchIntervalHours; }
    public Map<String, Object> getAutoSearchParams() { return autoSearchParams; }
    public LocalDateTime getAutoSearchLastRun() { return autoSearchLastRun; }
    public SubscriptionTier getSubscriptionTier() {
        return subscriptionTier != null ? subscriptionTier : SubscriptionTier.FREE;
    }
    public void setSubscriptionTier(SubscriptionTier subscriptionTier) { this.subscriptionTier = subscriptionTier; }

    public Set<Role> getRoles() {
        // Guard for users persisted before roles field was added
        return roles != null ? roles : EnumSet.of(Role.ROLE_USER);
    }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }

    // ── Setters ───────────────────────────────────────────────────────────────

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
    public void setExperienceYears(int experienceYears) { this.experienceYears = experienceYears; }
    public void setTargetRoles(List<String> targetRoles) { this.targetRoles = targetRoles; }
    public void setNotInterestedReasons(List<String> notInterestedReasons) { this.notInterestedReasons = notInterestedReasons; }
    public void setSkipKeywords(List<String> skipKeywords) { this.skipKeywords = skipKeywords; }
    public void setAutoSearchEnabled(boolean autoSearchEnabled) { this.autoSearchEnabled = autoSearchEnabled; }
    public void setAutoSearchIntervalHours(int autoSearchIntervalHours) { this.autoSearchIntervalHours = autoSearchIntervalHours; }
    public void setAutoSearchParams(Map<String, Object> autoSearchParams) { this.autoSearchParams = autoSearchParams; }
    public void setAutoSearchLastRun(LocalDateTime autoSearchLastRun) { this.autoSearchLastRun = autoSearchLastRun; }
    public void setRoles(Set<Role> roles) { this.roles = roles; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }

    public static Builder builder() { return new Builder(); }

    public static final class Builder {

        private String id, email, passwordHash, name, phone, location, title, summary;
        private Map<String, Object> skills, preferences;
        private AuthProvider authProvider = AuthProvider.LOCAL;
        private boolean emailVerified = false;
        private String oauthId, avatarUrl, linkedinUrl, githubUrl, portfolioUrl;
        private int experienceYears;
        private List<String> targetRoles, notInterestedReasons, skipKeywords;
        private Set<Role> roles;
        private SubscriptionTier subscriptionTier = SubscriptionTier.FREE;
        private boolean autoSearchEnabled = false;
        private int autoSearchIntervalHours = 24;
        private Map<String, Object> autoSearchParams;
        private LocalDateTime autoSearchLastRun, createdAt, updatedAt;

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
        public Builder experienceYears(int experienceYears) { this.experienceYears = experienceYears; return this; }
        public Builder targetRoles(List<String> targetRoles) { this.targetRoles = targetRoles; return this; }
        public Builder notInterestedReasons(List<String> reasons) { this.notInterestedReasons = reasons; return this; }
        public Builder skipKeywords(List<String> keywords) { this.skipKeywords = keywords; return this; }
        public Builder roles(Set<Role> roles) { this.roles = roles; return this; }
        public Builder subscriptionTier(SubscriptionTier tier) { this.subscriptionTier = tier; return this; }
        public Builder autoSearchEnabled(boolean enabled) { this.autoSearchEnabled = enabled; return this; }
        public Builder autoSearchIntervalHours(int hours) { this.autoSearchIntervalHours = hours; return this; }
        public Builder autoSearchParams(Map<String, Object> params) { this.autoSearchParams = params; return this; }
        public Builder autoSearchLastRun(LocalDateTime lastRun) { this.autoSearchLastRun = lastRun; return this; }
        public Builder createdAt(LocalDateTime createdAt) { this.createdAt = createdAt; return this; }
        public Builder updatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; return this; }

        public User build() {
            User user = new User();
            user.id = id;
            user.email = email;
            user.passwordHash = passwordHash;
            user.name = name;
            user.phone = phone;
            user.location = location;
            user.title = title;
            user.summary = summary;
            user.skills = skills;
            user.authProvider = authProvider;
            user.emailVerified = emailVerified;
            user.oauthId = oauthId;
            user.avatarUrl = avatarUrl;
            user.preferences = preferences;
            user.linkedinUrl = linkedinUrl;
            user.githubUrl = githubUrl;
            user.portfolioUrl = portfolioUrl;
            user.experienceYears = experienceYears;
            user.targetRoles = targetRoles;
            user.notInterestedReasons = notInterestedReasons;
            user.skipKeywords = skipKeywords;
            user.roles = roles != null ? roles : EnumSet.of(Role.ROLE_USER);
            user.subscriptionTier = subscriptionTier != null ? subscriptionTier : SubscriptionTier.FREE;
            user.autoSearchEnabled = autoSearchEnabled;
            user.autoSearchIntervalHours = autoSearchIntervalHours;
            user.autoSearchParams = autoSearchParams;
            user.autoSearchLastRun = autoSearchLastRun;
            user.createdAt = Optional.ofNullable(createdAt).orElseGet(LocalDateTime::now);
            user.updatedAt = Optional.ofNullable(updatedAt).orElseGet(LocalDateTime::now);
            return user;
        }
    }
}
