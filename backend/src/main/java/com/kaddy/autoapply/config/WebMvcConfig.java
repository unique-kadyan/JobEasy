package com.kaddy.autoapply.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.lang.NonNull;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebMvcConfig implements WebMvcConfigurer {

    private final RateLimitInterceptor rateLimitInterceptor;

    public WebMvcConfig(RateLimitInterceptor rateLimitInterceptor) {
        this.rateLimitInterceptor = rateLimitInterceptor;
    }

    @Override
    public void addInterceptors(@NonNull InterceptorRegistry registry) {
        registry.addInterceptor(rateLimitInterceptor)
                .addPathPatterns(
                        "/api/auth/login",
                        "/api/auth/signup",
                        "/api/auth/refresh",
                        "/api/auth/forgot-password",
                        "/api/auth/reset-password",
                        "/api/jobs/search",
                        "/api/jobs/*/summarize",
                        "/api/cover-letters/generate",
                        "/api/resumes/upload",
                        "/api/smart-resume/**",
                        "/api/applications/bulk-apply",
                        "/api/career-path/**",
                        "/api/interview-prep/**",
                        "/api/subscriptions/**"
                );
    }
}
