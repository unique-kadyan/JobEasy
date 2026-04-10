package com.kaddy.autoapply.service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

import com.kaddy.autoapply.config.FeatureConfig;
import com.kaddy.autoapply.dto.response.JobResponse;
import com.kaddy.autoapply.dto.response.PagedResponse;
import com.kaddy.autoapply.exception.ResourceNotFoundException;
import com.kaddy.autoapply.model.Job;
import com.kaddy.autoapply.model.enums.JobSource;

import com.kaddy.autoapply.repository.JobRepository;
import com.kaddy.autoapply.repository.UserRepository;
import com.kaddy.autoapply.service.ai.AiProviderFactory;
import com.kaddy.autoapply.service.scraper.ScraperOrchestrator;
import java.util.concurrent.Executor;

@ExtendWith(MockitoExtension.class)
class JobServiceTest {

    @Mock JobRepository jobRepository;
    @Mock ScraperOrchestrator scraperOrchestrator;
    @Mock JobScoringService jobScoringService;
    @Mock UserRepository userRepository;
    @Mock FeatureConfig featureConfig;
    @Mock AiProviderFactory aiProviderFactory;
    @Mock Executor executor;

    @InjectMocks
    JobService jobService;

    private Job dbJob;
    private JobResponse scrapedJob;

    @BeforeEach
    void setUp() {

        lenient().doAnswer(inv -> { ((Runnable) inv.getArgument(0)).run(); return null; }).when(executor).execute(any());
        lenient().when(featureConfig.maxJobResults(any())).thenReturn(Integer.MAX_VALUE);

        dbJob = Job.builder()
                .id("db1").externalId("ext1").source(JobSource.INDEED)
                .title("Backend Engineer").company("TechCo").location("Remote")
                .url("https://example.com").jobType("FULL_TIME")
                .datePosted(LocalDateTime.now()).scrapedAt(LocalDateTime.now())
                .build();

        scrapedJob = new JobResponse(null, "ext2", "INDEED",
                "Frontend Dev", "StartupCo", "NYC",
                "https://example.com/2", null, null, null, "FULL_TIME",
                LocalDateTime.now(), null, null, null, null, null, null);
    }

    @Test
    void searchJobs_shouldReturnDbResultsWhenAvailable() {
        var dbPage = new PageImpl<>(List.of(dbJob), PageRequest.of(0, 30), 1);
        when(scraperOrchestrator.searchJobs(any(), any(), anyInt())).thenReturn(List.of(scrapedJob));
        when(jobRepository.searchJobs(eq("java"), any())).thenReturn(dbPage);
        when(jobRepository.findBySourceAndExternalId(any(), any())).thenReturn(Optional.of(dbJob));

        PagedResponse<JobResponse> result = jobService.searchJobs("java", null, null, 0, 30);

        assertEquals(1, result.totalElements());
        assertEquals("Backend Engineer", result.content().get(0).title());
        assertEquals(0, result.number());
        assertEquals(30, result.size());
    }

    @Test
    void searchJobs_shouldFallBackToScrapedWhenDbEmpty() {
        var emptyPage = new PageImpl<>(List.<Job>of(), PageRequest.of(0, 30), 0);
        when(scraperOrchestrator.searchJobs(any(), any(), anyInt())).thenReturn(List.of(scrapedJob));
        when(jobRepository.searchJobs(any(), any())).thenReturn(emptyPage);

        PagedResponse<JobResponse> result = jobService.searchJobs("java", null, null, 0, 30);

        assertEquals(1, result.totalElements());
        assertEquals("Frontend Dev", result.content().get(0).title());
    }

    @Test
    void searchJobs_shouldReturnEmptyWhenNoResultsAnywhere() {
        var emptyPage = new PageImpl<>(List.<Job>of(), PageRequest.of(0, 30), 0);
        when(scraperOrchestrator.searchJobs(any(), any(), anyInt())).thenReturn(List.of());
        when(jobRepository.searchJobs(any(), any())).thenReturn(emptyPage);

        PagedResponse<JobResponse> result = jobService.searchJobs("noresults", null, null, 0, 30);

        assertTrue(result.content().isEmpty());
        assertEquals(0, result.totalElements());
        assertEquals(0, result.totalPages());
    }

    @Test
    void searchJobs_shouldFilterBySourceWhenProvided() {
        var dbPage = new PageImpl<>(List.of(dbJob), PageRequest.of(0, 30), 1);
        when(scraperOrchestrator.searchJobs(any(), any(), anyInt())).thenReturn(List.of());
        when(jobRepository.searchJobsBySource(eq("java"), eq("INDEED"), any())).thenReturn(dbPage);

        PagedResponse<JobResponse> result = jobService.searchJobs("java", null, "INDEED", 0, 30);

        assertEquals(1, result.totalElements());
        verify(jobRepository).searchJobsBySource(eq("java"), eq("INDEED"), any());
        verify(jobRepository, never()).searchJobs(any(), any());
    }

    @Test
    void searchJobs_fallbackPaginationShouldBeCorrect() {

        List<JobResponse> fiveJobs = List.of(
                makeScraped("j1"), makeScraped("j2"), makeScraped("j3"),
                makeScraped("j4"), makeScraped("j5"));
        var emptyPage = new PageImpl<>(List.<Job>of(), PageRequest.of(1, 2), 0);
        when(scraperOrchestrator.searchJobs(any(), any(), anyInt())).thenReturn(fiveJobs);
        when(jobRepository.searchJobs(any(), any())).thenReturn(emptyPage);

        PagedResponse<JobResponse> result = jobService.searchJobs("x", null, null, 1, 2);

        assertEquals(5, result.totalElements());
        assertEquals(3, result.totalPages());
        assertEquals(2, result.content().size());
        assertEquals(1, result.number());
    }

    @Test
    void getJob_shouldReturnMappedResponse() {
        when(jobRepository.findById("db1")).thenReturn(Optional.of(dbJob));

        JobResponse response = jobService.getJob("db1");

        assertEquals("db1", response.id());
        assertEquals("Backend Engineer", response.title());
        assertEquals("TechCo", response.company());
        assertEquals("INDEED", response.source());
    }

    @Test
    void getJobEntity_shouldThrowForUnknownId() {
        when(jobRepository.findById("unknown")).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> jobService.getJobEntity("unknown"));
    }

    @Test
    void cacheJobs_shouldSkipJobWhenRepositoryThrows() {

        var badJob = makeScraped("extBad");
        var goodJob = makeScraped("extGood");
        var emptyPage = new PageImpl<>(List.<Job>of(), PageRequest.of(0, 30), 0);

        when(scraperOrchestrator.searchJobs(any(), any(), anyInt())).thenReturn(List.of(badJob, goodJob));
        when(jobRepository.searchJobs(any(), any())).thenReturn(emptyPage);
        when(jobRepository.findBySourceAndExternalId(any(), eq("extBad")))
                .thenThrow(new RuntimeException("DB connection lost"));
        when(jobRepository.findBySourceAndExternalId(any(), eq("extGood")))
                .thenReturn(Optional.empty());

        assertDoesNotThrow(() -> jobService.searchJobs("java", null, null, 0, 30));

        verify(jobRepository).findBySourceAndExternalId(any(), eq("extGood"));
    }

    @Test
    void cacheJobs_shouldNotSaveAlreadyCachedJob() {
        var emptyPage = new PageImpl<>(List.<Job>of(), PageRequest.of(0, 30), 0);
        when(scraperOrchestrator.searchJobs(any(), any(), anyInt())).thenReturn(List.of(scrapedJob));
        when(jobRepository.searchJobs(any(), any())).thenReturn(emptyPage);
        when(jobRepository.findBySourceAndExternalId(any(), eq("ext2")))
                .thenReturn(Optional.of(dbJob));

        jobService.searchJobs("java", null, null, 0, 30);

        verify(jobRepository, never()).save(any());
    }

    private JobResponse makeScraped(String externalId) {
        return new JobResponse(null, externalId, "INDEED",
                "Dev", "Co", "NY",
                "https://x.com", null, null, null, "FULL_TIME",
                LocalDateTime.now(), null, externalId, null, null, null, null);
    }
}
