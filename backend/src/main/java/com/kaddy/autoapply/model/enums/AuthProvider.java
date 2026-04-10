package com.kaddy.autoapply.model.enums;

public enum AuthProvider {

    LOCAL,

    GOOGLE,

    LINKEDIN;

    public boolean isOAuth() {
        return this == GOOGLE || this == LINKEDIN;
    }

    public String displayName() {
        return switch (this) {
            case LOCAL    -> "Email / Password";
            case GOOGLE   -> "Google";
            case LINKEDIN -> "LinkedIn";
        };
    }
}
