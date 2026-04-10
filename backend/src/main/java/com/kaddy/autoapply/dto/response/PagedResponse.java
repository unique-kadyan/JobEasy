package com.kaddy.autoapply.dto.response;

import java.util.List;

public record PagedResponse<T>(
        List<T> content,
        long totalElements,
        int totalPages,
        int number,
        int size,
        String generatedQuery
) {

    public PagedResponse(List<T> content, long totalElements, int totalPages, int number, int size) {
        this(content, totalElements, totalPages, number, size, null);
    }
}
