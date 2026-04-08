package com.kaddy.autoapply.exception;

public final class RateLimitException extends AppException {
    public RateLimitException(String message) {
        super(message, 429);
    }
}
