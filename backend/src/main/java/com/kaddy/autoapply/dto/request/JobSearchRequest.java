package com.kaddy.autoapply.dto.request;

public record JobSearchRequest(
        String query,
        String location,
        String source,
        int page,
        int size
) {
    public JobSearchRequest {
        if (page < 0) page = 0;
        if (size <= 0 || size > 50) size = 20;
    }
}
