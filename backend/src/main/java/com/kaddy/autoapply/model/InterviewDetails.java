package com.kaddy.autoapply.model;

import java.time.LocalDateTime;

/**
 * Immutable value object — interview details embedded inside an {@link Application}.
 *
 * <p>Modelling as a record guarantees structural equality, thread-safety,
 * and eliminates the mutable builder pattern for an object that is always
 * created complete and never partially updated.
 *
 * <p>Spring Data MongoDB 3.3+ maps records natively via their canonical constructor.
 */
public record InterviewDetails(
        int round,
        String date,
        String time,
        String timezone,
        String interviewerName,
        String meetingLink,
        String platform,
        String notes,
        LocalDateTime recordedAt
) {
    /** Compact constructor — defaults {@code recordedAt} to now if absent. */
    public InterviewDetails {
        if (recordedAt == null) recordedAt = LocalDateTime.now();
    }

    /**
     * Convenience factory — supplies {@code recordedAt = now()}.
     * Use this when creating a fresh interview entry from a request DTO.
     */
    public static InterviewDetails of(int round, String date, String time,
                                       String timezone, String interviewerName,
                                       String meetingLink, String platform, String notes) {
        return new InterviewDetails(round, date, time, timezone,
                interviewerName, meetingLink, platform, notes, LocalDateTime.now());
    }
}
