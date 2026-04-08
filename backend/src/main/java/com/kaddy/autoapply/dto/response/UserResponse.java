package com.kaddy.autoapply.dto.response;

import java.time.LocalDateTime;
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
        LocalDateTime createdAt
) {}
