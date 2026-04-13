package com.kaddy.autoapply.service;

import java.time.Duration;
import java.util.concurrent.TimeUnit;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;

@Service
public class TokenBlacklistService {

    private static final Logger log = LoggerFactory.getLogger(TokenBlacklistService.class);
    private static final String KEY_PREFIX = "blacklist:token:";
    private static final String USER_REVOKE_PREFIX = "blacklist:user:";
    private static final Duration USER_REVOKE_TTL = Duration.ofDays(30);

    private final StringRedisTemplate redisTemplate;

    /**
     * Positive-only fallback: stores TRUE for blacklisted tokens / revoked users.
     * Used as the safety net when Redis is fully unavailable (outage).
     * TTL = 1 hour (matches max access-token lifetime).
     */
    private final Cache<String, Boolean> localFallback = Caffeine.newBuilder()
            .maximumSize(20_000)
            .expireAfterWrite(1, TimeUnit.HOURS)
            .build();

    /**
     * Short-term read cache (30 s) storing both TRUE and FALSE results.
     * Eliminates the Redis round-trip on every authenticated request for the
     * overwhelmingly common case where the token/user is NOT blacklisted.
     *
     * 30 s is short enough that a logout or revoke takes effect within one TTL
     * window, yet long enough to collapse thousands of per-request Redis calls
     * per user into a single lookup.
     *
     * When a token IS blacklisted or a user IS revoked, this cache is updated
     * immediately with TRUE so the protection is instant even before the 30 s
     * expire.
     */
    private final Cache<String, Boolean> shortTermCache = Caffeine.newBuilder()
            .maximumSize(50_000)
            .expireAfterWrite(30, TimeUnit.SECONDS)
            .build();

    public TokenBlacklistService(StringRedisTemplate redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    public void blacklist(String token, long ttlSeconds) {
        if (ttlSeconds <= 0)
            return;
        String key = KEY_PREFIX + token;
        localFallback.put(key, Boolean.TRUE);
        shortTermCache.put(key, Boolean.TRUE);
        try {
            redisTemplate.opsForValue().set(key, "1", ttlSeconds, TimeUnit.SECONDS);
        } catch (Exception e) {
            log.error("Redis unavailable — token blacklisted in local cache only (logout best-effort): {}",
                    e.getMessage());
        }
    }

    public boolean isBlacklisted(String token) {
        String key = KEY_PREFIX + token;
        Boolean cached = shortTermCache.getIfPresent(key);
        if (cached != null)
            return cached;
        try {
            boolean result = Boolean.TRUE.equals(redisTemplate.hasKey(key));
            shortTermCache.put(key, result);
            if (result)
                localFallback.put(key, Boolean.TRUE);
            return result;
        } catch (Exception e) {
            log.error("Redis unavailable for blacklist check — falling back to local cache: {}",
                    e.getMessage());
            return Boolean.TRUE.equals(localFallback.getIfPresent(key));
        }
    }

    public void revokeAllForUser(String userId) {
        String key = USER_REVOKE_PREFIX + userId;
        localFallback.put(key, Boolean.TRUE);
        shortTermCache.put(key, Boolean.TRUE);
        try {
            redisTemplate.opsForValue().set(key, String.valueOf(System.currentTimeMillis()), USER_REVOKE_TTL);
            log.info("All tokens revoked for user {}", userId);
        } catch (Exception e) {
            log.error("Redis unavailable — user revocation stored in local cache only for user {}: {}",
                    userId, e.getMessage());
        }
    }

    public boolean isUserRevoked(String userId) {
        String key = USER_REVOKE_PREFIX + userId;
        Boolean cached = shortTermCache.getIfPresent(key);
        if (cached != null)
            return cached;
        try {
            boolean result = Boolean.TRUE.equals(redisTemplate.hasKey(key));
            shortTermCache.put(key, result);
            if (result)
                localFallback.put(key, Boolean.TRUE);
            return result;
        } catch (Exception e) {
            log.error("Redis unavailable for user revocation check — falling back to local cache for user {}: {}",
                    userId, e.getMessage());
            return Boolean.TRUE.equals(localFallback.getIfPresent(key));
        }
    }
}
