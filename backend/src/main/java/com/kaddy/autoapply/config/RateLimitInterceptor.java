package com.kaddy.autoapply.config;

import com.kaddy.autoapply.exception.RateLimitException;
import com.kaddy.autoapply.model.enums.SubscriptionTier;
import com.kaddy.autoapply.repository.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import java.time.Duration;

@Component
public class RateLimitInterceptor implements HandlerInterceptor {

    private static final Logger log = LoggerFactory.getLogger(RateLimitInterceptor.class);

    private final StringRedisTemplate redis;
    private final FeatureConfig featureConfig;
    private final UserRepository userRepository;

    public RateLimitInterceptor(StringRedisTemplate redis,
                                 FeatureConfig featureConfig,
                                 UserRepository userRepository) {
        this.redis = redis;
        this.featureConfig = featureConfig;
        this.userRepository = userRepository;
    }

    @Override
    public boolean preHandle(@NonNull HttpServletRequest request,
                             @NonNull HttpServletResponse response,
                             @NonNull Object handler) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()
                || auth instanceof AnonymousAuthenticationToken
                || !(auth.getPrincipal() instanceof String userId)) {
            return true;
        }

        SubscriptionTier tier = userRepository.findById(userId)
                .map(u -> u.getSubscriptionTier() != null ? u.getSubscriptionTier() : SubscriptionTier.FREE)
                .orElse(SubscriptionTier.FREE);

        int limit = featureConfig.rateLimitPerMinute(tier);
        String key = "rl:" + userId + ":" + sanitizeEndpoint(request.getRequestURI());

        Long count = redis.opsForValue().increment(key);
        if (count != null && count == 1) {
            redis.expire(key, Duration.ofMinutes(1));
        }

        if (count != null && count > limit) {
            log.warn("Rate limit hit for user {} on {} (count={}, limit={})", userId,
                    request.getRequestURI(), count, limit);
            throw new RateLimitException(
                    "Too many requests. You are allowed " + limit +
                    " requests per minute on your " + tier.name().toLowerCase() + " plan.");
        }

        response.setHeader("X-RateLimit-Limit", String.valueOf(limit));
        response.setHeader("X-RateLimit-Remaining", String.valueOf(Math.max(0, limit - (count != null ? count : 0))));
        return true;
    }

    private String sanitizeEndpoint(String uri) {
        return uri.replaceAll("[^a-zA-Z0-9/]", "_");
    }
}
