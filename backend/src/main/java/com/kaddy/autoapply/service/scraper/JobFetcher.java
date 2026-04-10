package com.kaddy.autoapply.service.scraper;

import com.kaddy.autoapply.dto.response.JobResponse;

import java.util.List;

@FunctionalInterface
public interface JobFetcher {
    List<JobResponse> fetch(String query, String location, int page);
}
