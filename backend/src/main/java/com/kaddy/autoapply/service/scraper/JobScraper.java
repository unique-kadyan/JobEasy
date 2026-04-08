package com.kaddy.autoapply.service.scraper;

import com.kaddy.autoapply.dto.response.JobResponse;

import java.util.List;

public interface JobScraper {
    String getSource();
    List<JobResponse> fetchJobs(String query, String location, int page);
}
