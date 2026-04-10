package com.kaddy.autoapply.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.PersistenceCreator;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

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

    @PersistenceCreator
    public SearchRun {}

    public static SearchRun create(String userId, List<String> queries,
                                    int totalFound, int totalMatched,
                                    Map<String, Integer> bySource) {
        return new SearchRun(null, userId, queries, totalFound, totalMatched,
                bySource, LocalDateTime.now());
    }
}
