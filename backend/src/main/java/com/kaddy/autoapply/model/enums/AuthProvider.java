package com.kaddy.autoapply.model.enums;

/**
 * Identifies how a user authenticated (or was originally registered).
 */
public enum AuthProvider {

    /** Email + password — credentials stored in the platform. */
    LOCAL,

    /** Google OAuth2 — identity delegated to Google. */
    GOOGLE,

    /** LinkedIn OAuth2 — identity delegated to LinkedIn. */
    LINKEDIN;

    /**
     * Returns {@code true} when the user authenticated via a third-party
     * OAuth2 provider (i.e., the platform does not hold a password hash).
     */
    public boolean isOAuth() {
        return this == GOOGLE || this == LINKEDIN;
    }

    /** Human-readable provider name for display. */
    public String displayName() {
        return switch (this) {
            case LOCAL    -> "Email / Password";
            case GOOGLE   -> "Google";
            case LINKEDIN -> "LinkedIn";
        };
    }
}
