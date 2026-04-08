package com.kaddy.autoapply.exception;

public final class BadRequestException extends AppException {
    public BadRequestException(String message) {
        super(message, 400);
    }
}
