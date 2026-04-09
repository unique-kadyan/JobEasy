package com.kaddy.autoapply.dto.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;

public record InterviewDetailsRequest(
        @Min(value = 1, message = "Round must be at least 1")
        int round,

        @NotBlank(message = "Interview date is required")
        String date,

        String time,
        String timezone,
        String interviewerName,
        String meetingLink,
        String platform,
        String notes
) {}
