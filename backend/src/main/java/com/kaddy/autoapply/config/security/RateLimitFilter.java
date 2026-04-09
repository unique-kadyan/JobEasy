package com.kaddy.autoapply.config.security;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Duration;

/**
 * Per-IP rate limiting to prevent brute force and DoS (OWASP A04:2021).
 * 60 requests per minute per IP for general endpoints.
 * 10 requests per minute for auth endpoints.
 *
 * <p><b>Memory safety:</b> Bucket state is stored in a bounded Caffeine cache
 * (max 200 000 entries) with 2-minute idle eviction. This prevents unbounded
 * heap growth from a simple {@code ConcurrentHashMap} when millions of distinct
 * IPs hit the server — each silent IP eventually evicts itself automatically.
 */
@Component
public class RateLimitFilter extends OncePerRequestFilter {

    /**
     * Bounded, auto-evicting cache keyed by {@code "ip:type"}.
     * <ul>
     *   <li>maximumSize — caps memory at ~200 K buckets regardless of unique-IP volume.</li>
     *   <li>expireAfterAccess(2 min) — silent IPs are evicted and their memory released.</li>
     * </ul>
     */
    private final Cache<String, Bucket> buckets = Caffeine.newBuilder()
            .maximumSize(200_000)
            .expireAfterAccess(Duration.ofMinutes(2))
            .build();

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request, @NonNull HttpServletResponse response,
                                    @NonNull FilterChain filterChain) throws ServletException, IOException {
        String ip = getClientIp(request);
        String path = request.getRequestURI();

        // Cache.get(key, mappingFn) is atomic — exactly one Bucket is created per key
        Bucket bucket = buckets.get(
                ip + ":" + (isAuthEndpoint(path) ? "auth" : "general"),
                k -> createBucket(isAuthEndpoint(path))
        );

        if (bucket.tryConsume(1)) {
            filterChain.doFilter(request, response);
        } else {
            response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
            response.setContentType("application/json");
            response.getWriter().write(
                    "{\"status\":429,\"message\":\"Too many requests. Please try again later.\"}"
            );
        }
    }

    private Bucket createBucket(boolean isAuth) {
        int capacity = isAuth ? 10 : 60;
        Bandwidth limit = Bandwidth.builder()
                .capacity(capacity)
                .refillGreedy(capacity, Duration.ofMinutes(1))
                .build();
        return Bucket.builder().addLimit(limit).build();
    }

    private boolean isAuthEndpoint(String path) {
        return path.startsWith("/api/auth/");
    }

    private String getClientIp(HttpServletRequest request) {
        String xff = request.getHeader("X-Forwarded-For");
        if (xff != null && !xff.isBlank()) {
            return xff.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
