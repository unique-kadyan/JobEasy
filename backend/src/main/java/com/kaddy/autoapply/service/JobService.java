package com.kaddy.autoapply.service;

import com.kaddy.autoapply.dto.response.JobResponse;
import com.kaddy.autoapply.dto.response.PagedResponse;
import com.kaddy.autoapply.exception.ResourceNotFoundException;
import com.kaddy.autoapply.model.Job;
import com.kaddy.autoapply.model.enums.JobSource;
import com.kaddy.autoapply.repository.JobRepository;
import com.kaddy.autoapply.service.scraper.ScraperOrchestrator;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class JobService {

    private static final Logger log = LoggerFactory.getLogger(JobService.class);

    private final JobRepository jobRepository;
    private final ScraperOrchestrator scraperOrchestrator;

    public JobService(JobRepository jobRepository, ScraperOrchestrator scraperOrchestrator) {
        this.jobRepository = jobRepository;
        this.scraperOrchestrator = scraperOrchestrator;
    }

    public PagedResponse<JobResponse> searchJobs(String query, String location,
                                                 String source, int page, int size) {
        List<JobResponse> scraped = scraperOrchestrator.searchJobs(query, location, page);
        cacheJobs(scraped);

        Page<Job> dbPage = (source != null && !source.isBlank())
                ? jobRepository.searchJobsBySource(query, source, PageRequest.of(page, size))
                : jobRepository.searchJobs(query, PageRequest.of(page, size));

        if (dbPage.hasContent()) {
            List<JobResponse> content = dbPage.getContent().stream()
                    .map(this::toJobResponse)
                    .toList();
            return new PagedResponse<>(content, dbPage.getTotalElements(),
                    dbPage.getTotalPages(), page, size);
        }

        // Fall back to scraped results with manual pagination
        int total = scraped.size();
        int from = page * size;
        int to = Math.min(from + size, total);
        List<JobResponse> pageContent = from < total ? scraped.subList(from, to) : List.of();
        int totalPages = total == 0 ? 0 : (int) Math.ceil((double) total / size);
        return new PagedResponse<>(pageContent, total, totalPages, page, size);
    }

    public JobResponse getJob(String id) {
        return toJobResponse(getJobEntity(id));
    }

    public Job getJobEntity(String id) {
        return jobRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Job not found"));
    }

    private void cacheJobs(List<JobResponse> jobs) {
        for (JobResponse jr : jobs) {
            try {
                JobSource source = JobSource.valueOf(jr.source());
                if (jr.externalId() != null
                        && jobRepository.findBySourceAndExternalId(source, jr.externalId()).isEmpty()) {
                    jobRepository.save(Job.builder()
                            .externalId(jr.externalId()).source(source)
                            .title(jr.title()).company(jr.company()).location(jr.location())
                            .url(jr.url()).description(jr.description()).salary(jr.salary())
                            .tags(jr.tags()).jobType(jr.jobType()).datePosted(jr.datePosted())
                            .scrapedAt(LocalDateTime.now())
                            .build());
                }
            } catch (Exception e) {
                log.debug("Failed to cache job {}: {}", jr.externalId(), e.getMessage());
            }
        }
    }

    private JobResponse toJobResponse(Job job) {
        return new JobResponse(
                job.getId(), job.getExternalId(), job.getSource().name(),
                job.getTitle(), job.getCompany(), job.getLocation(),
                job.getUrl(), job.getDescription(), job.getSalary(),
                job.getTags(), job.getJobType(), job.getDatePosted(), null
        );
    }
}
