package com.kaddy.autoapply.service;

import java.util.LinkedHashMap;
import java.util.Map;

import org.bson.Document;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.aggregation.Aggregation;
import org.springframework.data.mongodb.core.aggregation.AggregationResults;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;

import com.kaddy.autoapply.dto.response.AnalyticsResponse;

/**
 * One aggregation pipeline replaces the previous 6 parallel
 * countByUserIdAndStatus
 * queries. The pipeline does a single collection scan (or index seek when the
 * user_status compound index is present) and groups by status in one
 * round-trip:
 *
 * db.applications.aggregate([
 * { $match: { userId: <id> } },
 * { $group: { _id: "$status", count: { $sum: 1 } } }
 * ])
 *
 * With the (userId, status) compound index this runs in O(log n) instead of
 * O(n).
 */
@Service
public class AnalyticsService {

    private static final Logger log = LoggerFactory.getLogger(AnalyticsService.class);

    private final MongoTemplate mongoTemplate;

    public AnalyticsService(MongoTemplate mongoTemplate) {
        this.mongoTemplate = mongoTemplate;
    }

    @PreAuthorize("isAuthenticated()")
    public AnalyticsResponse getSummary(String userId) {
        Map<String, Long> counts = new LinkedHashMap<>();
        try {
            Aggregation agg = Aggregation.newAggregation(
                    Aggregation.match(Criteria.where("userId").is(userId)),
                    Aggregation.group("status").count().as("count"));
            AggregationResults<Document> results = mongoTemplate.aggregate(agg, "applications", Document.class);

            for (Document doc : results.getMappedResults()) {
                String status = doc.getString("_id");
                Number count = (Number) doc.get("count");
                if (status != null && count != null) {
                    counts.put(status, count.longValue());
                }
            }
        } catch (Exception e) {
            log.warn("Analytics aggregation failed for user {} — returning zeros: {}", userId, e.getMessage());
        }

        long applied = counts.getOrDefault("APPLIED", 0L);
        long interviewing = counts.getOrDefault("INTERVIEWING", 0L);
        long offered = counts.getOrDefault("OFFERED", 0L);
        long rejected = counts.getOrDefault("REJECTED", 0L);
        long withdrawn = counts.getOrDefault("WITHDRAWN", 0L);
        long total = counts.values().stream().mapToLong(Long::longValue).sum();

        double responseRate = total > 0
                ? (double) (interviewing + offered + rejected) / total * 100
                : 0;

        Map<String, Long> byStatus = new LinkedHashMap<>();
        byStatus.put("APPLIED", applied);
        byStatus.put("INTERVIEWING", interviewing);
        byStatus.put("OFFERED", offered);
        byStatus.put("REJECTED", rejected);
        byStatus.put("WITHDRAWN", withdrawn);

        return new AnalyticsResponse(
                total, applied, interviewing, offered, rejected,
                Math.round(responseRate * 100.0) / 100.0,
                byStatus);
    }
}
