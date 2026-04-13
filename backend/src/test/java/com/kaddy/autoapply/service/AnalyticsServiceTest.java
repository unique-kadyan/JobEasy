package com.kaddy.autoapply.service;

import java.util.List;

import org.bson.Document;
import static org.junit.jupiter.api.Assertions.assertEquals;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import static org.mockito.Mockito.when;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.aggregation.Aggregation;
import org.springframework.data.mongodb.core.aggregation.AggregationResults;

import com.kaddy.autoapply.dto.response.AnalyticsResponse;

@ExtendWith(MockitoExtension.class)
class AnalyticsServiceTest {

    @Mock
    MongoTemplate mongoTemplate;
    @InjectMocks
    AnalyticsService analyticsService;

    @Test
    void getSummary_shouldReturnCorrectCounts() {
        List<Document> docs = List.of(
                new Document("_id", "APPLIED").append("count", 5),
                new Document("_id", "INTERVIEWING").append("count", 2),
                new Document("_id", "OFFERED").append("count", 1),
                new Document("_id", "REJECTED").append("count", 2),
                new Document("_id", "WITHDRAWN").append("count", 0));
        AggregationResults<Document> results = new AggregationResults<>(docs, new Document("ok", 1));

        when(mongoTemplate.aggregate(any(Aggregation.class), eq("applications"), eq(Document.class)))
                .thenReturn(results);

        AnalyticsResponse response = analyticsService.getSummary("u1");

        assertEquals(10, response.totalApplications());
        assertEquals(5, response.applied());
        assertEquals(2, response.interviewing());
        assertEquals(1, response.offered());
        assertEquals(50.0, response.responseRate());
    }

    @Test
    void getSummary_shouldHandleZeroApplications() {
        AggregationResults<Document> empty = new AggregationResults<>(List.of(), new Document("ok", 1));

        when(mongoTemplate.aggregate(any(Aggregation.class), eq("applications"), eq(Document.class)))
                .thenReturn(empty);

        AnalyticsResponse response = analyticsService.getSummary("u2");

        assertEquals(0, response.totalApplications());
        assertEquals(0.0, response.responseRate());
    }
}
