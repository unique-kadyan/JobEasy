package com.kaddy.autoapply.controller;

import java.time.LocalDateTime;
import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import static org.mockito.ArgumentMatchers.any;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import static org.mockito.Mockito.when;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.http.converter.json.JacksonJsonHttpMessageConverter;
import org.springframework.test.web.servlet.MockMvc;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.validation.beanvalidation.LocalValidatorFactoryBean;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.kaddy.autoapply.dto.request.LoginRequest;
import com.kaddy.autoapply.dto.request.SignupRequest;
import com.kaddy.autoapply.dto.response.AuthResponse;
import com.kaddy.autoapply.dto.response.UserResponse;
import com.kaddy.autoapply.exception.GlobalExceptionHandler;
import com.kaddy.autoapply.service.AuthService;

@ExtendWith(MockitoExtension.class)
class AuthControllerTest {

        @Mock
        private AuthService authService;

        @InjectMocks
        private AuthController authController;

        private MockMvc mockMvc;

        private final ObjectMapper objectMapper = new ObjectMapper()
                        .registerModule(new JavaTimeModule())
                        .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);

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

        UserResponse userResponse = new UserResponse(
                        "u1", "test@test.com", "Test", null, null, null,
                        null, null, null, null, null, null, null, false, 0, null, null, false, 0,
                        LocalDateTime.now(), List.of("ROLE_USER"), null, false);

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
                var request = new LoginRequest("test@test.com", "password123", false);
                var authResponse = new AuthResponse("access", "refresh", userResponse);

                when(authService.login(any(LoginRequest.class))).thenReturn(authResponse);

                mockMvc.perform(post("/api/auth/login")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(objectMapper.writeValueAsString(request)))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.accessToken").value("access"));
        }

        @Test
        void protectedEndpoint_shouldReturn4xxWithoutToken() throws Exception {
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
