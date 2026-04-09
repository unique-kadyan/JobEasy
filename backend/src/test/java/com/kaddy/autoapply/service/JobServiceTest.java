package com.kaddy.autoapply.service;

import com.kaddy.autoapply.dto.response.JobResponse;
import com.kaddy.autoapply.dto.response.PagedResponse;
import com.kaddy.autoapply.exception.ResourceNotFoundException;
import com.kaddy.autoapply.model.Job;
import com.kaddy.autoapply.model.enums.JobSource;
import com.kaddy.autoapply.repository.JobRepository;
import com.kaddy.autoapply.service.scraper.ScraperOrchestrator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class JobServiceTest {

    @Mock JobRepository jobRepository;
    @Mock ScraperOrchestrator scraperOrchestrator;

    @InjectMocks JobService jobService;

    private Job dbJob;
    private JobResponse scrapedJob;

    @BeforeEach
    void setUp() {
        dbJob = Job.builder()
                .id("db1").externalId("ext1").source(JobSource.INDEED)
                .title("Backend Engineer").company("TechCo").location("Remote")
                .url("https://example.com").jobType("FULL_TIME")
                .datePosted(LocalDateTime.now()).scrapedAt(LocalDateTime.now())
                .build();

        scrapedJob = new JobResponse(null, "ext2", "INDEED",
                "Frontend Dev", "StartupCo", "NYC",
                "https://example.com/2", null, null, null, "FULL_TIME",
                LocalDateTime.now(), null);
    }

    // ── searchJobs — DB path ──────────────────────────────────────────────────

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

    // ── searchJobs — pagination ───────────────────────────────────────────────

    @Test
    void searchJobs_fallbackPaginationShouldBeCorrect() {
        // 5 scraped jobs, page size 2, requesting page 1
        List<JobResponse> fiveJobs = List.of(
                makeScraped("j1"), makeScraped("j2"), makeScraped("j3"),
                makeScraped("j4"), makeScraped("j5")
        );
        var emptyPage = new PageImpl<>(List.<Job>of(), PageRequest.of(1, 2), 0);
        when(scraperOrchestrator.searchJobs(any(), any(), anyInt())).thenReturn(fiveJobs);
        when(jobRepository.searchJobs(any(), any())).thenReturn(emptyPage);

        PagedResponse<JobResponse> result = jobService.searchJobs("x", null, null, 1, 2);

        assertEquals(5, result.totalElements());
        assertEquals(3, result.totalPages());
        assertEquals(2, result.content().size()); // page 1 = items [2,3]
        assertEquals(1, result.number());
    }

    // ── getJob / getJobEntity ─────────────────────────────────────────────────

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

    // ── cacheJobs — resilience ────────────────────────────────────────────────

    @Test
    void cacheJobs_shouldSkipJobWhenRepositoryThrows() {
        // First scraped job will cause a repo exception; second should still be attempted
        var badJob = makeScraped("extBad");
        var goodJob = makeScraped("extGood");
        var emptyPage = new PageImpl<>(List.<Job>of(), PageRequest.of(0, 30), 0);

        when(scraperOrchestrator.searchJobs(any(), any(), anyInt())).thenReturn(List.of(badJob, goodJob));
        when(jobRepository.searchJobs(any(), any())).thenReturn(emptyPage);
        when(jobRepository.findBySourceAndExternalId(any(), eq("extBad")))
                .thenThrow(new RuntimeException("DB connection lost"));
        when(jobRepository.findBySourceAndExternalId(any(), eq("extGood")))
                .thenReturn(Optional.empty());

        // Should NOT throw — resilience catch in cacheJobs
        assertDoesNotThrow(() -> jobService.searchJobs("java", null, null, 0, 30));
        // Good job should still be attempted after bad one fails
        verify(jobRepository).findBySourceAndExternalId(any(), eq("extGood"));
    }

    @Test
    void cacheJobs_shouldNotSaveAlreadyCachedJob() {
        var emptyPage = new PageImpl<>(List.<Job>of(), PageRequest.of(0, 30), 0);
        when(scraperOrchestrator.searchJobs(any(), any(), anyInt())).thenReturn(List.of(scrapedJob));
        when(jobRepository.searchJobs(any(), any())).thenReturn(emptyPage);
        when(jobRepository.findBySourceAndExternalId(any(), eq("ext2")))
                .thenReturn(Optional.of(dbJob)); // already cached

        jobService.searchJobs("java", null, null, 0, 30);

        verify(jobRepository, never()).save(any());
    }

    // ── helpers ───────────────────────────────────────────────────────────────

    private JobResponse makeScraped(String externalId) {
        return new JobResponse(null, externalId, "INDEED",
                "Dev", "Co", "NY",
                "https://x.com", null, null, null, "FULL_TIME",
                LocalDateTime.now(), null);
    }
}
