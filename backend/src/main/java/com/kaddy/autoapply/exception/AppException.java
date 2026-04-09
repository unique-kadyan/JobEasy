package com.kaddy.autoapply.exception;

public sealed abstract class AppException extends RuntimeException
        permits ResourceNotFoundException, BadRequestException, AiServiceException, RateLimitException, ExternalServiceException {

    private final int statusCode;

    protected AppException(String message, int statusCode) {
        super(message);
        this.statusCode = statusCode;
    }

    protected AppException(String message, int statusCode, Throwable cause) {
        super(message, cause);
        this.statusCode = statusCode;
    }

    public int getStatusCode() {
        return statusCode;
    }
}
