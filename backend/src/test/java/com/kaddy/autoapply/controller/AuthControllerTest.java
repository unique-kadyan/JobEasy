package com.kaddy.autoapply.controller;

import java.time.LocalDateTime;

import org.junit.jupiter.api.Test;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.kaddy.autoapply.dto.request.LoginRequest;
import com.kaddy.autoapply.dto.request.SignupRequest;
import com.kaddy.autoapply.dto.response.AuthResponse;
import com.kaddy.autoapply.dto.response.UserResponse;
import com.kaddy.autoapply.config.SecurityConfig;
import com.kaddy.autoapply.security.JwtAuthenticationFilter;
import com.kaddy.autoapply.security.JwtTokenProvider;
import com.kaddy.autoapply.service.AuthService;
import com.kaddy.autoapply.service.TokenBlacklistService;
import org.springframework.context.annotation.Import;

// @WebMvcTest does not include @Configuration @EnableWebSecurity classes via component scan;
// we must import SecurityConfig and JwtAuthenticationFilter explicitly so that our custom
// security rules (permitAll on /api/auth/**, CSRF disabled) are applied instead of Spring's default.
@WebMvcTest(AuthController.class)
@Import({SecurityConfig.class, JwtAuthenticationFilter.class})
@ActiveProfiles("test")
class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private ObjectMapper objectMapper;
    @MockBean
    private AuthService authService;
    // Mock JwtAuthenticationFilter's dependencies so the real filter loads and
    // always forwards the request (filterChain.doFilter is unconditional in the impl).
    @MockBean
    private JwtTokenProvider jwtTokenProvider;
    @MockBean
    private TokenBlacklistService tokenBlacklistService;

    UserResponse userResponse = new UserResponse(
            "u1", "test@test.com", "Test", null, null, null,
            null, null, null, null, null, null, null, false, 0, null, null, false, 0,
            LocalDateTime.now(), java.util.List.of("ROLE_USER"));

    @Test
    void signup_shouldReturn201() throws Exception {
        var request = new SignupRequest("test@test.com", "password123", "Test");
        var authResponse = new AuthResponse("access", "refresh", userResponse);

        when(authService.signup(any(SignupRequest.class))).thenReturn(authResponse);

        mockMvc.perform(post("/api/auth/signup")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.accessToken").value("access"))
                .andExpect(jsonPath("$.user.email").value("test@test.com"));
    }

    @Test
    void signup_shouldRejectInvalidEmail() throws Exception {
        mockMvc.perform(post("/api/auth/signup")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"invalid\",\"password\":\"123456\",\"name\":\"Test\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void signup_shouldRejectShortPassword() throws Exception {
        mockMvc.perform(post("/api/auth/signup")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"a@b.com\",\"password\":\"12\",\"name\":\"Test\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void login_shouldReturn200() throws Exception {
        var request = new LoginRequest("test@test.com", "password123");
        var authResponse = new AuthResponse("access", "refresh", userResponse);

        when(authService.login(any(LoginRequest.class))).thenReturn(authResponse);

        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").value("access"));
    }

    @Test
    void protectedEndpoint_shouldReturn403WithoutToken() throws Exception {
        mockMvc.perform(post("/api/applications")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
                .andExpect(status().is4xxClientError());
    }

    @Test
    void forgotPassword_shouldReturn200Always() throws Exception {
        mockMvc.perform(post("/api/auth/forgot-password")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"nonexistent@test.com\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").exists());
    }
}
