package com.kaddy.autoapply.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.concurrent.TimeUnit;

@Service
public class TokenBlacklistService {

    private static final Logger log = LoggerFactory.getLogger(TokenBlacklistService.class);
    private static final String KEY_PREFIX        = "blacklist:token:";
    private static final String USER_REVOKE_PREFIX = "blacklist:user:";

    private static final Duration USER_REVOKE_TTL  = Duration.ofDays(30);

    private final StringRedisTemplate redisTemplate;

    public TokenBlacklistService(StringRedisTemplate redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

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

    public boolean isBlacklisted(String token) {
        try {
            return Boolean.TRUE.equals(redisTemplate.hasKey(KEY_PREFIX + token));
        } catch (Exception e) {
            log.warn("Failed to check token blacklist, allowing request: {}", e.getMessage());
            return false;
        }
    }

    public void revokeAllForUser(String userId) {
        try {
            String marker = String.valueOf(System.currentTimeMillis());
            redisTemplate.opsForValue().set(USER_REVOKE_PREFIX + userId, marker, USER_REVOKE_TTL);
            log.info("All tokens revoked for user {}", userId);
        } catch (Exception e) {
            log.warn("Failed to revoke tokens for user {} (best-effort): {}", userId, e.getMessage());
        }
    }

    public boolean isUserRevoked(String userId) {
        try {
            return Boolean.TRUE.equals(redisTemplate.hasKey(USER_REVOKE_PREFIX + userId));
        } catch (Exception e) {
            log.warn("Failed to check user revocation for {}, allowing request: {}", userId, e.getMessage());
            return false;
        }
    }
}
