package com.kaddy.autoapply.exception;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.kaddy.autoapply.dto.request.SignupRequest;
import com.kaddy.autoapply.service.AuthService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import java.util.concurrent.atomic.AtomicInteger;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Verifies that GlobalExceptionHandler (@RestControllerAdvice) maps each
 * exception type to the correct HTTP status and returns an ApiError body.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class GlobalExceptionHandlerTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;
    @MockBean  AuthService authService;

    /**
     * Each test that hits /api/auth/* gets a unique IP so the rate-limit bucket
     * (10 req/min per IP) is never exhausted across the test suite.
     */
    private static final AtomicInteger ipSuffix = new AtomicInteger(0);

    private MockHttpServletRequestBuilder uniqueIp(MockHttpServletRequestBuilder req) {
        return req.header("X-Forwarded-For", "10.99.0." + ipSuffix.incrementAndGet());
    }

    // ── 400 via MethodArgumentNotValidException (bean validation) ─────────────

    @Test
    void invalidEmail_shouldReturn400WithApiError() throws Exception {
        String body = """
                {"email":"not-an-email","password":"password123","name":"Test"}
                """;
        mockMvc.perform(uniqueIp(post("/api/auth/signup"))
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.message").exists())
                .andExpect(jsonPath("$.path").value("/api/auth/signup"))
                .andExpect(jsonPath("$.timestamp").exists());
    }

    @Test
    void shortPassword_shouldReturn400() throws Exception {
        String body = """
                {"email":"a@b.com","password":"12","name":"Test"}
                """;
        mockMvc.perform(uniqueIp(post("/api/auth/signup"))
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400));
    }

    // ── 400 via AppException (BadRequestException) ────────────────────────────

    @Test
    void duplicateSignup_shouldReturn400WithAppExceptionMessage() throws Exception {
        when(authService.signup(any())).thenThrow(new BadRequestException("Email already registered"));

        String body = objectMapper.writeValueAsString(
                new SignupRequest("dup@test.com", "password123", "Test"));

        mockMvc.perform(uniqueIp(post("/api/auth/signup"))
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.message").value("Email already registered"))
                .andExpect(jsonPath("$.path").value("/api/auth/signup"));
    }

    // ── 400 via HttpMessageNotReadableException (malformed JSON) ─────────────

    @Test
    void malformedJson_shouldReturn400() throws Exception {
        mockMvc.perform(uniqueIp(post("/api/auth/signup"))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{this is not json}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400));
    }

    // ── 400 via HttpMediaTypeNotSupportedException ────────────────────────────

    @Test
    void wrongContentType_shouldReturn400() throws Exception {
        mockMvc.perform(uniqueIp(post("/api/auth/signup"))
                .contentType(MediaType.TEXT_PLAIN)
                .content("some text"))
                .andExpect(status().isBadRequest());
    }

    // ── 401 via AuthenticationException (no token on protected route) ─────────

    @Test
    void noToken_shouldReturn401OnProtectedEndpoint() throws Exception {
        mockMvc.perform(get("/api/users/me"))
                .andExpect(status().isForbidden()); // Spring Security returns 403 before auth
    }

    // ── 404 via NoResourceFoundException (unknown route) ─────────────────────

    @Test
    @WithMockUser
    void unknownRoute_shouldReturn404WithApiError() throws Exception {
        mockMvc.perform(get("/api/this-route-does-not-exist"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404));
    }

    // ── 404 via ResourceNotFoundException (AppException subtype) ─────────────

    @Test
    void resourceNotFound_shouldReturn404() throws Exception {
        when(authService.signup(any())).thenThrow(new ResourceNotFoundException("User not found"));

        String body = objectMapper.writeValueAsString(
                new SignupRequest("a@b.com", "password123", "Test"));

        mockMvc.perform(uniqueIp(post("/api/auth/signup"))
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.message").value("User not found"));
    }

    // ── 405 via HttpRequestMethodNotSupportedException ────────────────────────

    @Test
    void wrongMethod_shouldReturn405() throws Exception {
        mockMvc.perform(uniqueIp(delete("/api/auth/login"))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
                .andExpect(status().isMethodNotAllowed())
                .andExpect(jsonPath("$.status").value(405));
    }

    // ── 503 via AiServiceException (AppException subtype) ────────────────────

    @Test
    void aiServiceUnavailable_shouldReturn503() throws Exception {
        when(authService.signup(any())).thenThrow(new AiServiceException("All AI providers unavailable"));

        String body = objectMapper.writeValueAsString(
                new SignupRequest("a@b.com", "password123", "Test"));

        mockMvc.perform(uniqueIp(post("/api/auth/signup"))
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.status").value(503));
    }

    // ── 429 via RateLimitException (AppException subtype) ────────────────────

    @Test
    void rateLimitExceeded_shouldReturn429() throws Exception {
        when(authService.signup(any())).thenThrow(new RateLimitException("Too many requests"));

        String body = objectMapper.writeValueAsString(
                new SignupRequest("a@b.com", "password123", "Test"));

        mockMvc.perform(uniqueIp(post("/api/auth/signup"))
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.status").value(429));
    }

    // ── 500 via generic RuntimeException (catch-all) ──────────────────────────

    @Test
    void unexpectedException_shouldReturn500() throws Exception {
        when(authService.signup(any())).thenThrow(new RuntimeException("Something went wrong internally"));

        String body = objectMapper.writeValueAsString(
                new SignupRequest("a@b.com", "password123", "Test"));

        mockMvc.perform(uniqueIp(post("/api/auth/signup"))
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.status").value(500))
                .andExpect(jsonPath("$.path").value("/api/auth/signup"));
    }

    // ── ApiError structure completeness ──────────────────────────────────────

    @Test
    void errorBody_shouldAlwaysHaveAllRequiredFields() throws Exception {
        when(authService.signup(any())).thenThrow(new BadRequestException("test"));

        String body = objectMapper.writeValueAsString(
                new SignupRequest("a@b.com", "password123", "Test"));

        mockMvc.perform(uniqueIp(post("/api/auth/signup"))
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
                .andExpect(jsonPath("$.status").exists())
                .andExpect(jsonPath("$.message").exists())
                .andExpect(jsonPath("$.path").exists())
                .andExpect(jsonPath("$.timestamp").exists());
    }
}
