package com.kaddy.autoapply.service;

import com.kaddy.autoapply.dto.request.LoginRequest;
import com.kaddy.autoapply.dto.request.ResetPasswordRequest;
import com.kaddy.autoapply.dto.request.SignupRequest;
import com.kaddy.autoapply.dto.response.AuthResponse;
import com.kaddy.autoapply.dto.response.UserResponse;
import com.kaddy.autoapply.exception.BadRequestException;
import com.kaddy.autoapply.exception.ResourceNotFoundException;
import com.kaddy.autoapply.model.PasswordResetToken;
import com.kaddy.autoapply.model.User;
import com.kaddy.autoapply.model.VerificationToken;
import com.kaddy.autoapply.repository.PasswordResetTokenRepository;
import com.kaddy.autoapply.repository.UserRepository;
import com.kaddy.autoapply.repository.VerificationTokenRepository;
import com.kaddy.autoapply.security.JwtTokenProvider;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.Optional;
import java.util.UUID;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider tokenProvider;
    private final TokenBlacklistService blacklistService;
    private final VerificationTokenRepository verificationTokenRepository;
    private final PasswordResetTokenRepository passwordResetTokenRepository;
    private final EmailService emailService;

    public AuthService(UserRepository userRepository,
                       PasswordEncoder passwordEncoder,
                       JwtTokenProvider tokenProvider,
                       TokenBlacklistService blacklistService,
                       VerificationTokenRepository verificationTokenRepository,
                       PasswordResetTokenRepository passwordResetTokenRepository,
                       EmailService emailService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.tokenProvider = tokenProvider;
        this.blacklistService = blacklistService;
        this.verificationTokenRepository = verificationTokenRepository;
        this.passwordResetTokenRepository = passwordResetTokenRepository;
        this.emailService = emailService;
    }

    public AuthResponse signup(SignupRequest request) {
        if (userRepository.existsByEmail(request.email())) {
            throw new BadRequestException("Email already registered");
        }

        User user = User.builder()
                .email(request.email())
                .passwordHash(passwordEncoder.encode(request.password()))
                .name(request.name())
                .emailVerified(false)
                .build();

        user = userRepository.save(user);

        String token = UUID.randomUUID().toString();
        verificationTokenRepository.save(VerificationToken.create(token, user.getId()));

        emailService.sendVerificationEmail(user.getEmail(), user.getName(), token);

        return buildAuthResponse(user);
    }

    public AuthResponse login(LoginRequest request) {
        User user = userRepository.findByEmail(request.email())
                .orElseThrow(() -> new BadRequestException("Invalid email or password"));

        Optional.ofNullable(user.getPasswordHash())
                .filter(hash -> passwordEncoder.matches(request.password(), hash))
                .orElseThrow(() -> new BadRequestException("Invalid email or password"));

        return buildAuthResponse(user);
    }

    public AuthResponse refresh(String refreshToken) {
        if (!tokenProvider.validateToken(refreshToken)) {
            throw new BadRequestException("Invalid refresh token");
        }

        String userId = tokenProvider.getUserIdFromToken(refreshToken);
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        return buildAuthResponse(user);
    }

    public void logout(String authorizationHeader) {
        if (!StringUtils.hasText(authorizationHeader) || !authorizationHeader.startsWith("Bearer ")) {
            return;
        }
        String token = authorizationHeader.substring(7);
        if (tokenProvider.validateToken(token) && tokenProvider.isAccessToken(token)) {
            blacklistService.blacklist(token, tokenProvider.getRemainingTtlSeconds(token));
        }
    }

    public UserResponse getCurrentUser(String userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        return toUserResponse(user);
    }

    public void verifyEmail(String token) {
        VerificationToken vt = verificationTokenRepository.findByToken(token)
                .orElseThrow(() -> new BadRequestException("Invalid verification token"));

        if (vt.isExpired()) {
            verificationTokenRepository.delete(vt);
            throw new BadRequestException("Verification link has expired. Please request a new one.");
        }

        User user = userRepository.findById(vt.userId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        user.setEmailVerified(true);
        userRepository.save(user);
        verificationTokenRepository.deleteByUserId(user.getId());
    }

    public void resendVerification(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new BadRequestException("Email not found"));

        if (user.isEmailVerified()) {
            throw new BadRequestException("Email is already verified");
        }

        verificationTokenRepository.deleteByUserId(user.getId());

        String token = UUID.randomUUID().toString();
        verificationTokenRepository.save(VerificationToken.create(token, user.getId()));

        emailService.sendVerificationEmail(user.getEmail(), user.getName(), token);
    }

    public void forgotPassword(String email) {
        User user = userRepository.findByEmail(email).orElse(null);

        if (user == null) return;

        passwordResetTokenRepository.deleteByUserId(user.getId());

        String token = UUID.randomUUID().toString();
        passwordResetTokenRepository.save(PasswordResetToken.create(token, user.getId()));

        emailService.sendPasswordResetEmail(user.getEmail(), user.getName(), token);
    }

    public void resetPassword(ResetPasswordRequest request) {
        PasswordResetToken prt = passwordResetTokenRepository.findByTokenAndUsedFalse(request.token())
                .orElseThrow(() -> new BadRequestException("Invalid or expired reset token"));

        if (prt.isExpired()) {
            passwordResetTokenRepository.delete(prt);
            throw new BadRequestException("Reset link has expired. Please request a new one.");
        }

        User user = userRepository.findById(prt.userId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        userRepository.save(user);

        passwordResetTokenRepository.save(prt.markUsed());
    }

    private AuthResponse buildAuthResponse(User user) {
        return new AuthResponse(
                tokenProvider.generateAccessToken(user.getId(), user.getEmail(), user.getRoles()),
                tokenProvider.generateRefreshToken(user.getId(), user.getEmail(), user.getRoles()),
                toUserResponse(user)
        );
    }

    public static UserResponse toUserResponse(User user) {
        java.util.List<String> roleNames = (user.getRoles() != null)
                ? user.getRoles().stream().map(Enum::name).toList()
                : java.util.List.of(com.kaddy.autoapply.model.enums.Role.ROLE_USER.name());
        return new UserResponse(
                user.getId(), user.getEmail(), user.getName(),
                user.getPhone(), user.getLocation(), user.getTitle(),
                user.getSummary(), user.getSkills(), user.getAvatarUrl(),
                user.getPreferences(), user.getLinkedinUrl(), user.getGithubUrl(),
                user.getPortfolioUrl(), user.isEmailVerified(),
                user.getExperienceYears(), user.getTargetRoles(), user.getSkipKeywords(),
                user.isAutoSearchEnabled(), user.getAutoSearchIntervalHours(),
                user.getCreatedAt(), roleNames, user.getSubscriptionTier()
        );
    }
}
