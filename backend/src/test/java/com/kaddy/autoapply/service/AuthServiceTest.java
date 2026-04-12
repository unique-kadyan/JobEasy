package com.kaddy.autoapply.service;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import com.kaddy.autoapply.dto.request.LoginRequest;
import com.kaddy.autoapply.dto.request.SignupRequest;
import com.kaddy.autoapply.dto.response.AuthResponse;
import com.kaddy.autoapply.exception.BadRequestException;
import com.kaddy.autoapply.model.User;
import com.kaddy.autoapply.repository.PasswordResetTokenRepository;
import com.kaddy.autoapply.repository.UserRepository;
import com.kaddy.autoapply.repository.VerificationTokenRepository;
import com.kaddy.autoapply.security.JwtTokenProvider;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UserRepository userRepository;
    @Mock
    private PasswordEncoder passwordEncoder;
    @Mock
    private JwtTokenProvider tokenProvider;
    @Mock
    private TokenBlacklistService blacklistService;
    @Mock
    private VerificationTokenRepository verificationTokenRepository;
    @Mock
    private PasswordResetTokenRepository passwordResetTokenRepository;
    @Mock
    private EmailService emailService;

    @InjectMocks
    private AuthService authService;

    private User testUser;

    @BeforeEach
    void setUp() {
        testUser = User.builder()
                .id("user1").email("test@example.com")
                .passwordHash("hashed").name("Test User")
                .emailVerified(false).build();
    }

    @Test
    void signup_shouldCreateUserAndReturnTokens() {
        var request = new SignupRequest("test@example.com", "password123", "Test User");

        when(userRepository.existsByEmail("test@example.com")).thenReturn(false);
        when(passwordEncoder.encode("password123")).thenReturn("hashed");
        when(userRepository.save(any(User.class))).thenReturn(testUser);
        when(tokenProvider.generateAccessToken(eq("user1"), eq("test@example.com"), any())).thenReturn("access-token");
        when(tokenProvider.generateRefreshToken(eq("user1"), eq("test@example.com"), any()))
                .thenReturn("refresh-token");
        when(verificationTokenRepository.save(any())).thenReturn(null);

        AuthResponse response = authService.signup(request);

        assertNotNull(response);
        assertEquals("access-token", response.accessToken());
        assertEquals("refresh-token", response.refreshToken());
        assertEquals("test@example.com", response.user().email());
        verify(emailService).sendVerificationEmail(eq("test@example.com"), eq("Test User"), anyString());
    }

    @Test
    void signup_shouldRejectDuplicateEmail() {
        var request = new SignupRequest("test@example.com", "password123", "Test User");

        when(userRepository.existsByEmail("test@example.com")).thenReturn(true);

        assertThrows(BadRequestException.class, () -> authService.signup(request));
    }

    @Test
    void login_shouldReturnTokensForValidCredentials() {
        var request = new LoginRequest("test@example.com", "password123", false);

        when(userRepository.findByEmail("test@example.com")).thenReturn(Optional.of(testUser));
        when(passwordEncoder.matches("password123", "hashed")).thenReturn(true);
        when(tokenProvider.generateAccessToken(eq("user1"), eq("test@example.com"), any())).thenReturn("access");
        when(tokenProvider.generateRefreshToken(eq("user1"), eq("test@example.com"), any())).thenReturn("refresh");

        AuthResponse response = authService.login(request);

        assertNotNull(response);
        assertEquals("access", response.accessToken());
    }

    @Test
    void login_shouldRejectInvalidPassword() {
        var request = new LoginRequest("test@example.com", "wrong", false);

        when(userRepository.findByEmail("test@example.com")).thenReturn(Optional.of(testUser));
        when(passwordEncoder.matches("wrong", "hashed")).thenReturn(false);

        assertThrows(BadRequestException.class, () -> authService.login(request));
    }

    @Test
    void login_shouldRejectUnknownEmail() {
        var request = new LoginRequest("unknown@example.com", "password", false);

        when(userRepository.findByEmail("unknown@example.com")).thenReturn(Optional.empty());

        assertThrows(BadRequestException.class, () -> authService.login(request));
    }

    @Test
    void forgotPassword_shouldNotRevealNonExistentEmail() {
        when(userRepository.findByEmail("ghost@example.com")).thenReturn(Optional.empty());

        assertDoesNotThrow(() -> authService.forgotPassword("ghost@example.com"));
        verify(emailService, never()).sendPasswordResetEmail(any(), any(), any());
    }
}
