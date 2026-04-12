package com.kaddy.autoapply.service;

import com.kaddy.autoapply.dto.request.ApplyRequest;
import com.kaddy.autoapply.dto.response.ApplicationResponse;
import com.kaddy.autoapply.exception.BadRequestException;
import com.kaddy.autoapply.exception.ResourceNotFoundException;
import com.kaddy.autoapply.model.Application;
import com.kaddy.autoapply.model.Job;
import com.kaddy.autoapply.model.Resume;
import com.kaddy.autoapply.model.enums.ApplicationStatus;
import com.kaddy.autoapply.model.enums.JobSource;
import com.kaddy.autoapply.repository.ApplicationRepository;
import com.kaddy.autoapply.repository.ResumeRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ApplicationServiceTest {

    @Mock
    ApplicationRepository applicationRepository;
    @Mock
    JobService jobService;
    @Mock
    ResumeRepository resumeRepository;

    @InjectMocks
    ApplicationService applicationService;

    private Job testJob;
    private Application testApp;

    @BeforeEach
    void setUp() {
        testJob = Job.builder()
                .id("job1").externalId("ext1").source(JobSource.INDEED)
                .title("Java Dev").company("Acme").location("Remote")
                .url("https://example.com").build();

        testApp = Application.builder()
                .id("app1").userId("user1").jobId("job1")
                .status(ApplicationStatus.APPLIED).build();
    }

    @Test
    void apply_shouldSaveAndReturnResponse() {
        var req = new ApplyRequest("job1", null, null, null);

        when(applicationRepository.existsByUserIdAndJobId("user1", "job1")).thenReturn(false);
        when(jobService.getJobEntity("job1")).thenReturn(testJob);
        when(resumeRepository.findByUserIdAndIsPrimaryTrue("user1")).thenReturn(Optional.empty());
        when(applicationRepository.save(any())).thenReturn(testApp);

        ApplicationResponse response = applicationService.apply("user1", req);

        assertNotNull(response);
        assertEquals("app1", response.id());
        assertEquals("APPLIED", response.status());
        verify(applicationRepository).save(any(Application.class));
    }

    @Test
    void apply_shouldUsePrimaryResumeWhenResumeIdNotProvided() {
        Resume resume = Resume.builder().id("resume1").userId("user1").build();
        var req = new ApplyRequest("job1", null, null, null);

        when(applicationRepository.existsByUserIdAndJobId("user1", "job1")).thenReturn(false);
        when(jobService.getJobEntity("job1")).thenReturn(testJob);
        when(resumeRepository.findByUserIdAndIsPrimaryTrue("user1")).thenReturn(Optional.of(resume));
        when(applicationRepository.save(any())).thenAnswer(inv -> {
            Application a = inv.getArgument(0);
            assertEquals("resume1", a.getResumeId());
            return testApp;
        });

        applicationService.apply("user1", req);
    }

    @Test
    void apply_shouldThrowWhenAlreadyApplied() {
        var req = new ApplyRequest("job1", null, null, null);
        when(applicationRepository.existsByUserIdAndJobId("user1", "job1")).thenReturn(true);

        assertThrows(BadRequestException.class, () -> applicationService.apply("user1", req));
        verify(applicationRepository, never()).save(any());
    }

    @Test
    void bulkApply_shouldSkipDuplicatesAndReturnSuccessful() {
        var req1 = new ApplyRequest("job1", null, null, null);
        var req2 = new ApplyRequest("job2", null, null, null);

        when(applicationRepository.existsByUserIdAndJobId("user1", "job1")).thenReturn(false);
        when(applicationRepository.existsByUserIdAndJobId("user1", "job2")).thenReturn(true);
        when(jobService.getJobEntity("job1")).thenReturn(testJob);
        when(resumeRepository.findByUserIdAndIsPrimaryTrue("user1")).thenReturn(Optional.empty());
        when(applicationRepository.save(any())).thenReturn(testApp);

        List<ApplicationResponse> results = applicationService.bulkApply("user1", List.of(req1, req2));

        assertEquals(1, results.size());
        assertEquals("app1", results.get(0).id());
    }

    @Test
    void bulkApply_shouldReturnEmptyListWhenAllDuplicate() {
        var req = new ApplyRequest("job1", null, null, null);
        when(applicationRepository.existsByUserIdAndJobId("user1", "job1")).thenReturn(true);

        List<ApplicationResponse> results = applicationService.bulkApply("user1", List.of(req));

        assertTrue(results.isEmpty());
    }

    @Test
    void getUserApplications_shouldReturnPageWithJobDetails() {
        var page = new PageImpl<>(List.of(testApp), PageRequest.of(0, 10), 1);
        // null filter → exclude DISMISSED via findByUserIdAndStatusNotOrderByAppliedAtDesc
        when(applicationRepository.findByUserIdAndStatusNotOrderByAppliedAtDesc(
                eq("user1"), eq(ApplicationStatus.DISMISSED), any()))
                .thenReturn(page);
        when(jobService.getJobEntity("job1")).thenReturn(testJob);

        var result = applicationService.getUserApplications("user1", null, 0, 10);

        assertEquals(1, result.getTotalElements());
        assertNotNull(result.getContent().get(0).job());
        assertEquals("Java Dev", result.getContent().get(0).job().title());
    }

    @Test
    void getUserApplications_shouldGracefullyHandleMissingJob() {
        var page = new PageImpl<>(List.of(testApp), PageRequest.of(0, 10), 1);
        when(applicationRepository.findByUserIdAndStatusNotOrderByAppliedAtDesc(
                eq("user1"), eq(ApplicationStatus.DISMISSED), any()))
                .thenReturn(page);
        when(jobService.getJobEntity("job1")).thenThrow(new ResourceNotFoundException("Job not found"));

        var result = applicationService.getUserApplications("user1", null, 0, 10);

        assertEquals(1, result.getTotalElements());
        assertNull(result.getContent().get(0).job());
    }

    @Test
    void getUserApplications_shouldFilterByStatus() {
        var page = new PageImpl<>(List.of(testApp), PageRequest.of(0, 10), 1);
        when(applicationRepository.findByUserIdAndStatusOrderByAppliedAtDesc(
                eq("user1"), eq(ApplicationStatus.APPLIED), any()))
                .thenReturn(page);
        when(jobService.getJobEntity("job1")).thenReturn(testJob);

        var result = applicationService.getUserApplications("user1", "APPLIED", 0, 10);

        assertEquals(1, result.getTotalElements());
    }

    @Test
    void updateStatus_shouldPersistNewStatus() {
        when(applicationRepository.findById("app1")).thenReturn(Optional.of(testApp));
        when(applicationRepository.save(any())).thenReturn(testApp);
        when(jobService.getJobEntity("job1")).thenReturn(testJob);

        ApplicationResponse response = applicationService.updateStatus("app1", "user1", "INTERVIEWING");

        verify(applicationRepository).save(argThat(a -> a.getStatus() == ApplicationStatus.INTERVIEWING));
        assertNotNull(response);
    }

    @Test
    void updateStatus_shouldThrowForUnknownApplication() {
        when(applicationRepository.findById("bad")).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> applicationService.updateStatus("bad", "user1", "INTERVIEWING"));
    }

    @Test
    void updateStatus_shouldGracefullyHandleMissingJob() {
        when(applicationRepository.findById("app1")).thenReturn(Optional.of(testApp));
        when(applicationRepository.save(any())).thenReturn(testApp);
        when(jobService.getJobEntity("job1")).thenThrow(new ResourceNotFoundException("gone"));

        assertDoesNotThrow(() -> applicationService.updateStatus("app1", "user1", "INTERVIEWING"));
    }

    @Test
    void delete_shouldDelegateToRepository() {
        when(applicationRepository.findById("app1")).thenReturn(Optional.of(testApp));
        applicationService.delete("app1", "user1");
        verify(applicationRepository).deleteById("app1");
    }
}
