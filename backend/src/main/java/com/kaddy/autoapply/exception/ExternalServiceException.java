package com.kaddy.autoapply.exception;

public final class ExternalServiceException extends AppException {

    public ExternalServiceException(String message) {
        super(message, 502);
    }

    public ExternalServiceException(String message, Throwable cause) {
        super(message, 502, cause);
    }
}
