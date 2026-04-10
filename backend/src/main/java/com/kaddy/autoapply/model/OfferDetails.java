package com.kaddy.autoapply.model;

import java.time.LocalDateTime;
import java.util.List;

public record OfferDetails(
        Double salary,
        String currency,
        String joiningDate,
        String deadline,
        List<String> benefits,
        String location,
        String offerText,
        String notes,
        LocalDateTime recordedAt
) {

    public OfferDetails {
        if (recordedAt == null) recordedAt = LocalDateTime.now();
    }

    public static OfferDetails of(Double salary, String currency, String joiningDate,
                                   String deadline, List<String> benefits, String location,
                                   String offerText, String notes) {
        return new OfferDetails(salary, currency, joiningDate, deadline,
                benefits, location, offerText, notes, LocalDateTime.now());
    }
}
