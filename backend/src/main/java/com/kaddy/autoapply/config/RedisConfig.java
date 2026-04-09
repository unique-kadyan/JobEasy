package com.kaddy.autoapply.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cache.Cache;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.interceptor.CacheErrorHandler;
import org.springframework.cache.interceptor.SimpleCacheErrorHandler;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.cache.RedisCacheConfiguration;
import org.springframework.data.redis.cache.RedisCacheManager;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.serializer.GenericJackson2JsonRedisSerializer;
import org.springframework.data.redis.serializer.RedisSerializationContext;

import java.time.Duration;
import java.util.Map;

/**
 * Redis configuration: distributed caching with per-cache TTLs.
 * Errors are logged and suppressed — cache failures degrade gracefully
 * to cache-miss behaviour so the application continues to work without Redis.
 */
@Configuration
@EnableCaching
public class RedisConfig {

    @Bean
    public RedisCacheManager cacheManager(RedisConnectionFactory factory) {
        RedisCacheConfiguration jsonConfig = RedisCacheConfiguration.defaultCacheConfig()
                .serializeValuesWith(RedisSerializationContext.SerializationPair
                        .fromSerializer(new GenericJackson2JsonRedisSerializer()))
                .disableCachingNullValues();

        Map<String, RedisCacheConfiguration> perCacheTtl = Map.of(
                "jobs",  jsonConfig.entryTtl(Duration.ofMinutes(60)),
                "users", jsonConfig.entryTtl(Duration.ofMinutes(15))
        );

        return RedisCacheManager.builder(factory)
                .cacheDefaults(jsonConfig.entryTtl(Duration.ofMinutes(10)))
                .withInitialCacheConfigurations(perCacheTtl)
                .build();
    }

    /**
     * Suppress cache errors so a Redis outage does not take down the application.
     * Each error is logged as a warning and the operation continues as a cache miss.
     */
    @Bean
    public CacheErrorHandler cacheErrorHandler() {
        return new LoggingCacheErrorHandler();
    }

    private static final class LoggingCacheErrorHandler extends SimpleCacheErrorHandler {

        private static final Logger log = LoggerFactory.getLogger(LoggingCacheErrorHandler.class);

        @Override
        public void handleCacheGetError(RuntimeException e, Cache cache, Object key) {
            log.warn("Cache GET failed [cache={}, key={}]: {}", cache.getName(), key, e.getMessage());
        }

        @Override
        public void handleCachePutError(RuntimeException e, Cache cache, Object key, Object value) {
            log.warn("Cache PUT failed [cache={}, key={}]: {}", cache.getName(), key, e.getMessage());
        }

        @Override
        public void handleCacheEvictError(RuntimeException e, Cache cache, Object key) {
            log.warn("Cache EVICT failed [cache={}, key={}]: {}", cache.getName(), key, e.getMessage());
        }

        @Override
        public void handleCacheClearError(RuntimeException e, Cache cache) {
            log.warn("Cache CLEAR failed [cache={}]: {}", cache.getName(), e.getMessage());
        }
    }
}
