package com.kaddy.autoapply.service;

import com.kaddy.autoapply.dto.response.AnalyticsResponse;
import com.kaddy.autoapply.model.enums.ApplicationStatus;
import com.kaddy.autoapply.repository.ApplicationRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.concurrent.Executor;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AnalyticsServiceTest {

    @Mock private ApplicationRepository applicationRepository;
    @Mock private Executor executor;
    @InjectMocks private AnalyticsService analyticsService;

    @BeforeEach
    void setUp() {
        // Run submitted tasks immediately so CompletableFuture chains complete synchronously
        doAnswer(inv -> { ((Runnable) inv.getArgument(0)).run(); return null; }).when(executor).execute(any());
    }

    @Test
    void getSummary_shouldReturnCorrectCounts() {
        when(applicationRepository.countByUserId("u1")).thenReturn(10L);
        when(applicationRepository.countByUserIdAndStatus("u1", ApplicationStatus.APPLIED)).thenReturn(5L);
        when(applicationRepository.countByUserIdAndStatus("u1", ApplicationStatus.INTERVIEWING)).thenReturn(2L);
        when(applicationRepository.countByUserIdAndStatus("u1", ApplicationStatus.OFFERED)).thenReturn(1L);
        when(applicationRepository.countByUserIdAndStatus("u1", ApplicationStatus.REJECTED)).thenReturn(2L);
        when(applicationRepository.countByUserIdAndStatus("u1", ApplicationStatus.WITHDRAWN)).thenReturn(0L);

        AnalyticsResponse response = analyticsService.getSummary("u1");

        assertEquals(10, response.totalApplications());
        assertEquals(5, response.applied());
        assertEquals(2, response.interviewing());
        assertEquals(1, response.offered());
        assertEquals(50.0, response.responseRate()); // (2+1+2)/10 * 100
    }

    @Test
    void getSummary_shouldHandleZeroApplications() {
        when(applicationRepository.countByUserId("u2")).thenReturn(0L);
        when(applicationRepository.countByUserIdAndStatus("u2", ApplicationStatus.APPLIED)).thenReturn(0L);
        when(applicationRepository.countByUserIdAndStatus("u2", ApplicationStatus.INTERVIEWING)).thenReturn(0L);
        when(applicationRepository.countByUserIdAndStatus("u2", ApplicationStatus.OFFERED)).thenReturn(0L);
        when(applicationRepository.countByUserIdAndStatus("u2", ApplicationStatus.REJECTED)).thenReturn(0L);
        when(applicationRepository.countByUserIdAndStatus("u2", ApplicationStatus.WITHDRAWN)).thenReturn(0L);

        AnalyticsResponse response = analyticsService.getSummary("u2");

        assertEquals(0, response.totalApplications());
        assertEquals(0.0, response.responseRate());
    }
}
