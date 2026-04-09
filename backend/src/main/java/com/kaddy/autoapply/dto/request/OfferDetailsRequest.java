package com.kaddy.autoapply.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;

import java.util.List;

public record OfferDetailsRequest(
        @Positive(message = "Salary must be positive")
        Double salary,

        String currency,

        @NotBlank(message = "Joining date is required")
        String joiningDate,

        String deadline,
        List<String> benefits,
        String location,
        String offerText,
        String notes
) {}
