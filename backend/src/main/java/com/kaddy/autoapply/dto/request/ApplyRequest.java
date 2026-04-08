package com.kaddy.autoapply.dto.request;

import jakarta.validation.constraints.NotBlank;

public record ApplyRequest(
        @NotBlank String jobId,
        String coverLetterId,
        String resumeId,
        String notes
) {}
