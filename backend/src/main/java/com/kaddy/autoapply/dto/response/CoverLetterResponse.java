package com.kaddy.autoapply.dto.response;

import java.time.LocalDateTime;

public record CoverLetterResponse(
        String id,
        String jobId,
        String jobTitle,
        String company,
        String content,
        String aiProvider,
        String aiModel,
        LocalDateTime createdAt
) {}
