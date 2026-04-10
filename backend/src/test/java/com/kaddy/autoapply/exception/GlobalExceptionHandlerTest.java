package com.kaddy.autoapply.exception;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.kaddy.autoapply.controller.AuthController;
import com.kaddy.autoapply.dto.request.SignupRequest;
import com.kaddy.autoapply.service.AuthService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.http.converter.json.JacksonJsonHttpMessageConverter;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.validation.beanvalidation.LocalValidatorFactoryBean;

import java.util.concurrent.atomic.AtomicInteger;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ExtendWith(MockitoExtension.class)
class GlobalExceptionHandlerTest {

    @Mock
    private AuthService authService;

    @InjectMocks
    private AuthController authController;

    private MockMvc mockMvc;

    private final ObjectMapper objectMapper = new ObjectMapper();

    private static final AtomicInteger ipSuffix = new AtomicInteger(0);

    @BeforeEach
    void setUp() {
        LocalValidatorFactoryBean validator = new LocalValidatorFactoryBean();
        validator.afterPropertiesSet();
        mockMvc = MockMvcBuilders
                .standaloneSetup(authController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .setValidator(validator)
                .setMessageConverters(new JacksonJsonHttpMessageConverter())
                .build();
    }

    private MockHttpServletRequestBuilder uniqueIp(MockHttpServletRequestBuilder req) {
        return req.header("X-Forwarded-For", "10.99.0." + ipSuffix.incrementAndGet());
    }

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

    @Test
    void malformedJson_shouldReturn400() throws Exception {
        mockMvc.perform(uniqueIp(post("/api/auth/signup"))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{this is not json}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400));
    }

    @Test
    void wrongContentType_shouldReturn400() throws Exception {
        mockMvc.perform(uniqueIp(post("/api/auth/signup"))
                .contentType(MediaType.TEXT_PLAIN)
                .content("some text"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void noToken_shouldReturn4xxOnProtectedEndpoint() throws Exception {
        mockMvc.perform(get("/api/users/me"))
                .andExpect(status().is4xxClientError());
    }

    @Test
    void unknownRoute_shouldReturn404WithApiError() throws Exception {
        mockMvc.perform(get("/api/this-route-does-not-exist"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404));
    }

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

    @Test
    void wrongMethod_shouldReturn405() throws Exception {
        mockMvc.perform(uniqueIp(delete("/api/auth/login"))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
                .andExpect(status().isMethodNotAllowed())
                .andExpect(jsonPath("$.status").value(405));
    }

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
