package com.kaddy.autoapply.service;

import com.kaddy.autoapply.config.security.InputSanitizer;
import com.kaddy.autoapply.dto.request.ProfileUpdateRequest;
import com.kaddy.autoapply.dto.response.UserResponse;
import com.kaddy.autoapply.exception.ResourceNotFoundException;
import com.kaddy.autoapply.model.User;
import com.kaddy.autoapply.repository.UserRepository;
import org.springframework.stereotype.Service;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final InputSanitizer sanitizer;

    public UserService(UserRepository userRepository, InputSanitizer sanitizer) {
        this.userRepository = userRepository;
        this.sanitizer = sanitizer;
    }

    public UserResponse getProfile(String userId) {
        return AuthService.toUserResponse(findUser(userId));
    }

    public UserResponse updateProfile(String userId, ProfileUpdateRequest request) {
        User user = findUser(userId);
        if (request.name() != null)        user.setName(sanitizer.sanitize(request.name()));
        if (request.phone() != null)       user.setPhone(sanitizer.sanitize(request.phone()));
        if (request.location() != null)    user.setLocation(sanitizer.sanitize(request.location()));
        if (request.title() != null)       user.setTitle(sanitizer.sanitize(request.title()));
        if (request.summary() != null)     user.setSummary(sanitizer.sanitizeAllowFormatting(request.summary()));
        if (request.skills() != null)       user.setSkills(request.skills());
        if (request.preferences() != null)  user.setPreferences(request.preferences());
        if (request.linkedinUrl() != null)   user.setLinkedinUrl(sanitizer.sanitize(request.linkedinUrl()));
        if (request.githubUrl() != null)     user.setGithubUrl(sanitizer.sanitize(request.githubUrl()));
        if (request.portfolioUrl() != null)  user.setPortfolioUrl(sanitizer.sanitize(request.portfolioUrl()));
        return AuthService.toUserResponse(userRepository.save(user));
    }

    public void deleteAccount(String userId) {
        userRepository.delete(findUser(userId));
    }

    private User findUser(String userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }
}
