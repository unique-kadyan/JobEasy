package com.kaddy.autoapply.dto.request;

import jakarta.validation.constraints.NotBlank;

public record TemplateRequest(
        @NotBlank String name,
        @NotBlank String content,
        String description
) {}
