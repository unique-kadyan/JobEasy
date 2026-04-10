package com.kaddy.autoapply.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.PersistenceCreator;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Document(collection = "application_status_history")
public record ApplicationStatusHistory(
        @Id            String id,
        @Indexed       String applicationId,
        String         oldStatus,
        String         newStatus,
        String         notes,
        LocalDateTime  changedAt
) {
    @PersistenceCreator
    public ApplicationStatusHistory {}

    public static ApplicationStatusHistory create(String applicationId,
                                                   String oldStatus,
                                                   String newStatus,
                                                   String notes) {
        return new ApplicationStatusHistory(
                null, applicationId, oldStatus, newStatus, notes, LocalDateTime.now());
    }
}
