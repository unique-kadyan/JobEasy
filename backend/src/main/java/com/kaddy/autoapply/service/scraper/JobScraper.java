package com.kaddy.autoapply.service.scraper;

import com.kaddy.autoapply.dto.response.JobResponse;

import java.util.List;

/**
 * Sealed contract for all job-board scraper/API clients.
 *
 * <p>The closed {@code permits} set gives the compiler a fixed universe of
 * scraper implementations, enabling exhaustive pattern-matching and preventing
 * accidental third-party extensions that bypass the orchestration layer.
 *
 * <p>Implementations are {@code non-sealed} so Spring's CGLIB proxy can
 * subclass them for {@code @Cacheable} / AOP advice without constraint.
 */
public sealed interface JobScraper
        permits JSearchApiClient, AdzunaApiClient, CareerJetApiClient, SerpApiClient,
                RemoteOKScraper, RemotiveScraper, ArbeitnowScraper, JobicyScraper, FindWorkScraper {

    /** The source identifier returned on every {@link JobResponse} this scraper produces. */
    String getSource();

    /**
     * Fetches a page of job listings for the given query.
     *
     * @param query    search keywords
     * @param location optional location filter (may be empty or null)
     * @param page     zero-based page index
     * @return list of jobs; never {@code null} — returns empty list on failure
     */
    List<JobResponse> fetchJobs(String query, String location, int page);
}
