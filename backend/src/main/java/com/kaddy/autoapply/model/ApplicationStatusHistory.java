package com.kaddy.autoapply.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.PersistenceCreator;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

/**
 * Immutable audit event recording a single status transition on an application.
 *
 * <p>Modelled as a record because status-history entries are append-only —
 * they are written once and never mutated. Spring Data MongoDB maps records
 * via {@link PersistenceCreator} (the canonical constructor).
 *
 * <p>Use {@link #create} to build new entries; {@code id} is left {@code null}
 * so MongoDB assigns the ObjectId on first save.
 */
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

    /** Factory for new history entries; stamps {@code changedAt} to now. */
    public static ApplicationStatusHistory create(String applicationId,
                                                   String oldStatus,
                                                   String newStatus,
                                                   String notes) {
        return new ApplicationStatusHistory(
                null, applicationId, oldStatus, newStatus, notes, LocalDateTime.now());
    }
}
