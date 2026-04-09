package com.kaddy.autoapply.service.scraper;

import com.kaddy.autoapply.dto.response.JobResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.concurrent.CompletableFuture;
import java.util.stream.Collectors;

@Service
public class ScraperOrchestrator {

    private static final Logger log = LoggerFactory.getLogger(ScraperOrchestrator.class);

    private final List<JobScraper> scrapers;

    public ScraperOrchestrator(List<JobScraper> scrapers) {
        this.scrapers = scrapers;
    }

    @Cacheable(value = "jobs", key = "#query + ':' + #location + ':' + #page")
    public List<JobResponse> searchJobs(String query, String location, int page) {
        List<CompletableFuture<List<JobResponse>>> futures = scrapers.stream()
                .map(scraper -> CompletableFuture.supplyAsync(() -> {
                    try {
                        return scraper.fetchJobs(query, location, page);
                    } catch (Exception e) {
                        log.error("Scraper {} failed: {}", scraper.getSource(), e.getMessage());
                        return List.<JobResponse>of();
                    }
                }))
                .toList();

        List<JobResponse> allJobs = futures.stream()
                .map(CompletableFuture::join)
                .flatMap(List::stream)
                .collect(Collectors.toList());

        // Deduplicate by URL
        Set<String> seenUrls = new HashSet<>();
        return allJobs.stream()
                .filter(job -> job.url() != null && seenUrls.add(job.url()))
                .collect(Collectors.toList());
    }
}
