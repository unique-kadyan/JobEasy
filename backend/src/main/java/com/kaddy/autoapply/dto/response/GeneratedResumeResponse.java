package com.kaddy.autoapply.dto.response;

import java.time.LocalDateTime;
import java.util.Map;

public record GeneratedResumeResponse(
        String id,
        Map<String, Object> resumeData,
        Map<String, Object> previewData,
        int atsScore,
        boolean paid,
        LocalDateTime generatedAt
) {}
