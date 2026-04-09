package com.kaddy.autoapply.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.PersistenceCreator;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * Append-only analytics document recording one job-search execution.
 *
 * <p>Modelled as a record — search runs are never mutated after creation.
 * Spring Data MongoDB 3.3+ resolves the {@code @Id} field automatically
 * via {@link PersistenceCreator} (the canonical constructor).
 *
 * <p>Create new instances with {@link #create}; the {@code id} is always
 * {@code null} on creation and is populated by MongoDB on save.
 */
@Document(collection = "search_runs")
public record SearchRun(
        @Id            String id,
        @Indexed       String userId,
        List<String>           queries,
        int                    totalFound,
        int                    totalMatched,
        Map<String, Integer>   bySource,
        LocalDateTime          runAt
) {
    /**
     * Spring Data MongoDB uses this constructor to rehydrate documents.
     * The annotation is redundant for records (the canonical constructor is
     * always the persistence creator), but is explicit for clarity.
     */
    @PersistenceCreator
    public SearchRun {}

    /**
     * Factory for new search run entries. {@code id} is left null so that
     * MongoDB assigns the ObjectId on first save.
     */
    public static SearchRun create(String userId, List<String> queries,
                                    int totalFound, int totalMatched,
                                    Map<String, Integer> bySource) {
        return new SearchRun(null, userId, queries, totalFound, totalMatched,
                bySource, LocalDateTime.now());
    }
}
