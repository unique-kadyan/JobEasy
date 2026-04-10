package com.kaddy.autoapply.service.scraper;

import com.kaddy.autoapply.dto.response.JobResponse;

import java.util.List;

public sealed interface JobScraper
        permits JSearchApiClient, AdzunaApiClient, CareerJetApiClient, SerpApiClient,
                RemoteOKScraper, RemotiveScraper, ArbeitnowScraper, JobicyScraper, FindWorkScraper,
                HimalayasScraper, TheMuseScraper, WorkingNomadsScraper, WeWorkRemotelyScraper,
                ReedApiClient, JoobleApiClient,
                DevITJobsScraper, UsaJobsApiClient,
                RemoteCoScraper, JobspressoScraper {

    String getSource();

    List<JobResponse> fetchJobs(String query, String location, int page);
}
