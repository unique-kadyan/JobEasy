package com.kaddy.autoapply.model;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Immutable value object — offer details embedded inside an {@link Application}.
 *
 * <p>Modelled as a record: structurally equal, thread-safe, no mutable builder needed.
 * Spring Data MongoDB maps records via the canonical constructor.
 */
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
    /** Compact constructor — defaults {@code recordedAt} to now if absent. */
    public OfferDetails {
        if (recordedAt == null) recordedAt = LocalDateTime.now();
    }

    /**
     * Convenience factory — supplies {@code recordedAt = now()}.
     * Use this when creating a fresh offer entry from a request DTO.
     */
    public static OfferDetails of(Double salary, String currency, String joiningDate,
                                   String deadline, List<String> benefits, String location,
                                   String offerText, String notes) {
        return new OfferDetails(salary, currency, joiningDate, deadline,
                benefits, location, offerText, notes, LocalDateTime.now());
    }
}
