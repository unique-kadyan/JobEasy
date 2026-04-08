package com.kaddy.autoapply.dto.response;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record ApplicationResponse(
        String id,
        JobResponse job,
        String status,
        BigDecimal matchScore,
        String notes,
        LocalDateTime appliedAt,
        LocalDateTime statusUpdated,
        boolean hasCoverLetter
) {}
