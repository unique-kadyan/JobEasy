package com.kaddy.autoapply.dto.request;

import java.util.Map;

public record ProfileUpdateRequest(
        String name,
        String phone,
        String location,
        String title,
        String summary,
        Map<String, Object> skills,
        Map<String, Object> preferences,
        String linkedinUrl,
        String githubUrl,
        String portfolioUrl
) {}
