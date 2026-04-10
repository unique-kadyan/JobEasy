package com.kaddy.autoapply.dto.response;

import com.kaddy.autoapply.model.enums.SubscriptionTier;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

public record UserResponse(
        String id,
        String email,
        String name,
        String phone,
        String location,
        String title,
        String summary,
        Map<String, Object> skills,
        String avatarUrl,
        Map<String, Object> preferences,
        String linkedinUrl,
        String githubUrl,
        String portfolioUrl,
        boolean emailVerified,
        int experienceYears,
        List<String> targetRoles,
        List<String> skipKeywords,
        boolean autoSearchEnabled,
        int autoSearchIntervalHours,
        LocalDateTime createdAt,
        List<String> roles,
        SubscriptionTier subscriptionTier,
        boolean onboardingCompleted
) {}
