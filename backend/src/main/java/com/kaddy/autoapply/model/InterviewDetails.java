package com.kaddy.autoapply.model;

import java.time.LocalDateTime;

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

    public InterviewDetails {
        if (recordedAt == null) recordedAt = LocalDateTime.now();
    }

    public static InterviewDetails of(int round, String date, String time,
                                       String timezone, String interviewerName,
                                       String meetingLink, String platform, String notes) {
        return new InterviewDetails(round, date, time, timezone,
                interviewerName, meetingLink, platform, notes, LocalDateTime.now());
    }
}
