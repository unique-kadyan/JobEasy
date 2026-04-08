package com.kaddy.autoapply.dto.request;

import jakarta.validation.constraints.NotBlank;

public record CoverLetterRequest(
        @NotBlank String jobId,
        String templateId,
        String provider
) {}
