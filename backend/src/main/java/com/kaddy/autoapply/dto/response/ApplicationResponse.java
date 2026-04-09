package com.kaddy.autoapply.dto.response;

import com.kaddy.autoapply.model.InterviewDetails;
import com.kaddy.autoapply.model.OfferDetails;

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
        boolean hasCoverLetter,
        InterviewDetails interviewDetails,
        OfferDetails offerDetails
) {}
