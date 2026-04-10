package com.kaddy.autoapply.exception;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class ExceptionHierarchyTest {

    @Test
    void sealedHierarchy_shouldHaveCorrectStatusCodes() {
        assertEquals(404, new ResourceNotFoundException("not found").getStatusCode());
        assertEquals(400, new BadRequestException("bad request").getStatusCode());
        assertEquals(503, new AiServiceException("unavailable").getStatusCode());
        assertEquals(429, new RateLimitException("too many").getStatusCode());
    }

    @Test
    void allExceptions_shouldExtendAppException() {
        assertInstanceOf(AppException.class, new ResourceNotFoundException("x"));
        assertInstanceOf(AppException.class, new BadRequestException("x"));
        assertInstanceOf(AppException.class, new AiServiceException("x"));
        assertInstanceOf(AppException.class, new RateLimitException("x"));
    }

    @Test
    void aiServiceException_shouldSupportCause() {
        var cause = new RuntimeException("root cause");
        var ex = new AiServiceException("failed", cause);
        assertEquals("failed", ex.getMessage());
        assertEquals(cause, ex.getCause());
        assertEquals(503, ex.getStatusCode());
    }

    @Test
    void sealedClass_onlyPermitsDefinedSubtypes() {

        var permitted = AppException.class.getPermittedSubclasses();
        assertNotNull(permitted);
        assertEquals(5, permitted.length);
    }
}
