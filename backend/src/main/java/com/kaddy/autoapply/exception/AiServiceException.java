package com.kaddy.autoapply.exception;

public final class AiServiceException extends AppException {
    public AiServiceException(String message) {
        super(message, 503);
    }

    public AiServiceException(String message, Throwable cause) {
        super(message, 503, cause);
    }
}
