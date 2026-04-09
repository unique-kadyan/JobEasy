package com.kaddy.autoapply.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.util.concurrent.TimeUnit;

/**
 * Maintains a Redis-backed blacklist of invalidated JWT access tokens.
 * Each entry expires automatically when the original token would have expired,
 * so the blacklist never grows unboundedly.
 *
 * If Redis is unavailable, operations fail silently: logout is best-effort
 * (the token remains valid until its natural expiry) and {@code isBlacklisted}
 * returns {@code false} so authenticated requests are never wrongly rejected.
 */
@Service
public class TokenBlacklistService {

    private static final Logger log = LoggerFactory.getLogger(TokenBlacklistService.class);
    private static final String KEY_PREFIX = "blacklist:token:";

    private final StringRedisTemplate redisTemplate;

    public TokenBlacklistService(StringRedisTemplate redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    /**
     * Adds {@code token} to the blacklist, expiring after {@code ttlSeconds}.
     * Calling this is a no-op when {@code ttlSeconds <= 0}.
     */
    public void blacklist(String token, long ttlSeconds) {
        if (ttlSeconds <= 0) {
            return;
        }
        try {
            redisTemplate.opsForValue().set(KEY_PREFIX + token, "1", ttlSeconds, TimeUnit.SECONDS);
        } catch (Exception e) {
            log.warn("Failed to blacklist token (logout is best-effort): {}", e.getMessage());
        }
    }

    /** Returns {@code true} if the token has been explicitly invalidated. */
    public boolean isBlacklisted(String token) {
        try {
            return Boolean.TRUE.equals(redisTemplate.hasKey(KEY_PREFIX + token));
        } catch (Exception e) {
            log.warn("Failed to check token blacklist, allowing request: {}", e.getMessage());
            return false;
        }
    }
}
