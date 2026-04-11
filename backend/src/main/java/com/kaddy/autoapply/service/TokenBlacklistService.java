package com.kaddy.autoapply.service;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.concurrent.TimeUnit;

@Service
public class TokenBlacklistService {

    private static final Logger log = LoggerFactory.getLogger(TokenBlacklistService.class);
    private static final String KEY_PREFIX         = "blacklist:token:";
    private static final String USER_REVOKE_PREFIX = "blacklist:user:";
    private static final Duration USER_REVOKE_TTL  = Duration.ofDays(30);

    private final StringRedisTemplate redisTemplate;

    /**
     * In-memory fallback cache used when Redis is unavailable.
     * Ensures recently blacklisted tokens and revoked users are still rejected
     * within the same JVM instance, even during Redis outages.
     * TTL matches the maximum access-token lifetime (1 hour) so entries self-expire.
     */
    private final Cache<String, Boolean> localFallback = Caffeine.newBuilder()
            .maximumSize(20_000)
            .expireAfterWrite(1, TimeUnit.HOURS)
            .build();

    public TokenBlacklistService(StringRedisTemplate redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    public void blacklist(String token, long ttlSeconds) {
        if (ttlSeconds <= 0) return;
        localFallback.put(KEY_PREFIX + token, Boolean.TRUE);
        try {
            redisTemplate.opsForValue().set(KEY_PREFIX + token, "1", ttlSeconds, TimeUnit.SECONDS);
        } catch (Exception e) {
            log.error("Redis unavailable — token blacklisted in local cache only (logout best-effort): {}",
                    e.getMessage());
        }
    }

    public boolean isBlacklisted(String token) {
        try {
            return Boolean.TRUE.equals(redisTemplate.hasKey(KEY_PREFIX + token));
        } catch (Exception e) {
            log.error("Redis unavailable for blacklist check — falling back to local cache: {}",
                    e.getMessage());
            return Boolean.TRUE.equals(localFallback.getIfPresent(KEY_PREFIX + token));
        }
    }

    public void revokeAllForUser(String userId) {
        localFallback.put(USER_REVOKE_PREFIX + userId, Boolean.TRUE);
        try {
            String marker = String.valueOf(System.currentTimeMillis());
            redisTemplate.opsForValue().set(USER_REVOKE_PREFIX + userId, marker, USER_REVOKE_TTL);
            log.info("All tokens revoked for user {}", userId);
        } catch (Exception e) {
            log.error("Redis unavailable — user revocation stored in local cache only for user {}: {}",
                    userId, e.getMessage());
        }
    }

    public boolean isUserRevoked(String userId) {
        try {
            return Boolean.TRUE.equals(redisTemplate.hasKey(USER_REVOKE_PREFIX + userId));
        } catch (Exception e) {
            log.error("Redis unavailable for user revocation check — falling back to local cache for user {}: {}",
                    userId, e.getMessage());
            return Boolean.TRUE.equals(localFallback.getIfPresent(USER_REVOKE_PREFIX + userId));
        }
    }
}
