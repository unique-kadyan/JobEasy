package com.kaddy.autoapply.exception;

/**
 * Thrown when an external third-party service (GitHub, etc.) returns an error
 * or is temporarily unavailable.  Maps to HTTP 502 Bad Gateway.
 */
public final class ExternalServiceException extends AppException {

    public ExternalServiceException(String message) {
        super(message, 502);
    }

    public ExternalServiceException(String message, Throwable cause) {
        super(message, 502, cause);
    }
}
