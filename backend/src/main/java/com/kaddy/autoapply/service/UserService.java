package com.kaddy.autoapply.service;

import com.kaddy.autoapply.config.security.InputSanitizer;
import com.kaddy.autoapply.dto.request.AutoSearchScheduleRequest;
import com.kaddy.autoapply.dto.request.ProfileUpdateRequest;
import com.kaddy.autoapply.dto.response.AutoSearchScheduleResponse;
import com.kaddy.autoapply.dto.response.UserResponse;
import com.kaddy.autoapply.exception.ResourceNotFoundException;
import com.kaddy.autoapply.model.User;
import com.kaddy.autoapply.repository.UserRepository;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
@PreAuthorize("hasAnyRole('USER', 'ADMIN')")
public class UserService {

    private final UserRepository userRepository;
    private final InputSanitizer sanitizer;
    private final GitHubImportService gitHubImportService;

    public UserService(UserRepository userRepository,
                       InputSanitizer sanitizer,
                       GitHubImportService gitHubImportService) {
        this.userRepository      = userRepository;
        this.sanitizer           = sanitizer;
        this.gitHubImportService = gitHubImportService;
    }

    @Cacheable(value = "users", key = "#userId")
    public UserResponse getProfile(String userId) {
        return AuthService.toUserResponse(findUser(userId));
    }

    @CacheEvict(value = "users", key = "#userId")
    public UserResponse updateProfile(String userId, ProfileUpdateRequest request) {
        User user = findUser(userId);
        if (request.name() != null)           user.setName(sanitizer.sanitize(request.name()));
        if (request.phone() != null)          user.setPhone(sanitizer.sanitize(request.phone()));
        if (request.location() != null)       user.setLocation(sanitizer.sanitize(request.location()));
        if (request.title() != null)          user.setTitle(sanitizer.sanitize(request.title()));
        if (request.summary() != null)        user.setSummary(sanitizer.sanitizeAllowFormatting(request.summary()));
        if (request.skills() != null)         user.setSkills(request.skills());
        if (request.preferences() != null)    user.setPreferences(request.preferences());
        if (request.linkedinUrl() != null)    user.setLinkedinUrl(sanitizer.sanitize(request.linkedinUrl()));
        if (request.githubUrl() != null)      user.setGithubUrl(sanitizer.sanitize(request.githubUrl()));
        if (request.portfolioUrl() != null)   user.setPortfolioUrl(sanitizer.sanitize(request.portfolioUrl()));
        if (request.experienceYears() != null) user.setExperienceYears(request.experienceYears());
        if (request.targetRoles() != null)    user.setTargetRoles(request.targetRoles());
        user.setUpdatedAt(LocalDateTime.now());
        return AuthService.toUserResponse(userRepository.save(user));
    }

    // ── GitHub import ─────────────────────────────────────────────────────────

    public UserResponse importFromGitHub(String userId, String githubUsername) {
        User updated = gitHubImportService.importSkills(userId, githubUsername);
        return AuthService.toUserResponse(updated);
    }

    // ── Skip keywords ─────────────────────────────────────────────────────────

    @CacheEvict(value = "users", key = "#userId")
    public UserResponse addSkipKeyword(String userId, String keyword) {
        User user = findUser(userId);
        String clean = sanitizer.sanitize(keyword).toLowerCase().strip();
        if (clean.isBlank()) return AuthService.toUserResponse(user);

        List<String> keywords = new ArrayList<>(
                user.getSkipKeywords() != null ? user.getSkipKeywords() : List.of());
        if (!keywords.contains(clean)) {
            keywords.add(clean);
            user.setSkipKeywords(keywords);
            user.setUpdatedAt(LocalDateTime.now());
            userRepository.save(user);
        }
        return AuthService.toUserResponse(user);
    }

    @CacheEvict(value = "users", key = "#userId")
    public UserResponse removeSkipKeyword(String userId, String keyword) {
        User user = findUser(userId);
        if (user.getSkipKeywords() == null) return AuthService.toUserResponse(user);

        List<String> keywords = new ArrayList<>(user.getSkipKeywords());
        keywords.remove(keyword.toLowerCase().strip());
        user.setSkipKeywords(keywords);
        user.setUpdatedAt(LocalDateTime.now());
        return AuthService.toUserResponse(userRepository.save(user));
    }

    // ── Not-interested reasons ────────────────────────────────────────────────

    @CacheEvict(value = "users", key = "#userId")
    public UserResponse addNotInterestedReason(String userId, String reason) {
        User user = findUser(userId);
        String clean = sanitizer.sanitize(reason).strip();
        if (clean.isBlank()) return AuthService.toUserResponse(user);

        List<String> reasons = new ArrayList<>(
                user.getNotInterestedReasons() != null ? user.getNotInterestedReasons() : List.of());
        if (!reasons.contains(clean)) {
            reasons.add(clean);
            user.setNotInterestedReasons(reasons);
            user.setUpdatedAt(LocalDateTime.now());
            userRepository.save(user);
        }
        return AuthService.toUserResponse(user);
    }

    @CacheEvict(value = "users", key = "#userId")
    public UserResponse removeNotInterestedReason(String userId, String reason) {
        User user = findUser(userId);
        if (user.getNotInterestedReasons() == null) return AuthService.toUserResponse(user);

        List<String> reasons = new ArrayList<>(user.getNotInterestedReasons());
        reasons.remove(reason.strip());
        user.setNotInterestedReasons(reasons);
        user.setUpdatedAt(LocalDateTime.now());
        return AuthService.toUserResponse(userRepository.save(user));
    }

    // ── Auto-search schedule ──────────────────────────────────────────────────

    public AutoSearchScheduleResponse getAutoSearchSchedule(String userId) {
        User user = findUser(userId);
        return toScheduleResponse(user);
    }

    @CacheEvict(value = "users", key = "#userId")
    public AutoSearchScheduleResponse updateAutoSearchSchedule(String userId,
                                                                AutoSearchScheduleRequest request) {
        User user = findUser(userId);
        if (request.enabled() != null) user.setAutoSearchEnabled(request.enabled());
        if (request.intervalHours() != null) {
            user.setAutoSearchIntervalHours(Integer.parseInt(request.intervalHours()));
        }
        if (request.searchParams() != null) user.setAutoSearchParams(request.searchParams());
        user.setUpdatedAt(LocalDateTime.now());
        User saved = userRepository.save(user);
        return toScheduleResponse(saved);
    }

    // ── Account ───────────────────────────────────────────────────────────────

    @CacheEvict(value = "users", key = "#userId")
    public void deleteAccount(String userId) {
        userRepository.delete(findUser(userId));
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private User findUser(String userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }

    private AutoSearchScheduleResponse toScheduleResponse(User user) {
        LocalDateTime nextRun = (user.isAutoSearchEnabled() && user.getAutoSearchLastRun() != null)
                ? user.getAutoSearchLastRun().plusHours(user.getAutoSearchIntervalHours())
                : null;
        return new AutoSearchScheduleResponse(
                user.isAutoSearchEnabled(),
                user.getAutoSearchIntervalHours(),
                user.getAutoSearchParams(),
                user.getAutoSearchLastRun(),
                nextRun
        );
    }
}
