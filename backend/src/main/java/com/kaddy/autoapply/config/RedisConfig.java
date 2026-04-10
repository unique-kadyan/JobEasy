package com.kaddy.autoapply.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import io.lettuce.core.RedisURI;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.Cache;
import org.springframework.cache.annotation.CachingConfigurer;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.interceptor.CacheErrorHandler;
import org.springframework.cache.interceptor.SimpleCacheErrorHandler;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.cache.RedisCacheConfiguration;
import org.springframework.data.redis.cache.RedisCacheManager;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.connection.RedisPassword;
import org.springframework.data.redis.connection.RedisStandaloneConfiguration;
import org.springframework.data.redis.connection.lettuce.LettuceConnectionFactory;
import org.springframework.data.redis.serializer.GenericJackson2JsonRedisSerializer;
import org.springframework.data.redis.serializer.RedisSerializationContext;
import org.springframework.util.StringUtils;

import java.time.Duration;
import java.util.Map;

/**
 * Redis configuration: connection factory + distributed caching with per-cache TTLs.
 *
 * <p>Connection strategy (in priority order):
 * <ol>
 *   <li><b>REDIS_URL env var</b> — full connection string injected by cloud platforms
 *       (Render, Railway, Heroku, Fly.io). Format: {@code redis://:password@host:port}</li>
 *   <li><b>spring.data.redis.host / port / password</b> — used for local Docker Redis
 *       when REDIS_URL is absent.</li>
 * </ol>
 *
 * <p>Cache errors are logged and suppressed — a Redis outage degrades gracefully
 * to cache-miss behaviour so the application continues to work without Redis.
 */
@Configuration
@EnableCaching
public class RedisConfig implements CachingConfigurer {

    private static final Logger log = LoggerFactory.getLogger(RedisConfig.class);

    @Value("${REDIS_URL:}")
    private String redisUrl;

    @Value("${spring.data.redis.host:localhost}")
    private String redisHost;

    @Value("${spring.data.redis.port:6379}")
    private int redisPort;

    @Value("${spring.data.redis.password:}")
    private String redisPassword;

    /**
     * Builds a {@link LettuceConnectionFactory} that works in every environment:
     * <ul>
     *   <li>Cloud (Render): reads {@code REDIS_URL} env var — no profile or dashboard config needed.</li>
     *   <li>Local Docker: falls back to {@code spring.data.redis.host/port/password} properties.</li>
     * </ul>
     *
     * <p>Spring Boot's auto-configured factory is suppressed because this bean
     * implements {@link RedisConnectionFactory} — Spring Boot's
     * {@code @ConditionalOnMissingBean(RedisConnectionFactory.class)} backs off automatically.
     */
    @Bean
    public LettuceConnectionFactory redisConnectionFactory() {
        RedisStandaloneConfiguration config;

        if (StringUtils.hasText(redisUrl)) {
            // Cloud environment: parse full connection URL
            // Render injects: redis://:password@hostname:port
            RedisURI uri = RedisURI.create(redisUrl);
            config = new RedisStandaloneConfiguration(uri.getHost(), uri.getPort());
            if (uri.getPassword() != null && uri.getPassword().length > 0) {
                config.setPassword(RedisPassword.of(uri.getPassword()));
            }
            log.info("Redis: connecting via REDIS_URL to {}:{}", uri.getHost(), uri.getPort());
        } else {
            // Local / dev environment: use host + port + password from Spring properties
            config = new RedisStandaloneConfiguration(redisHost, redisPort);
            if (StringUtils.hasText(redisPassword)) {
                config.setPassword(RedisPassword.of(redisPassword));
            }
            log.info("Redis: connecting via host/port to {}:{}", redisHost, redisPort);
        }

        return new LettuceConnectionFactory(config);
    }

    @Bean
    public RedisCacheManager cacheManager(RedisConnectionFactory factory) {
        // ObjectMapper with JSR310 so LocalDateTime fields in cached objects
        // serialize as ISO-8601 strings instead of throwing InvalidDefinitionException.
        ObjectMapper cacheMapper = new ObjectMapper()
                .registerModule(new JavaTimeModule())
                .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS)
                .activateDefaultTyping(
                        new ObjectMapper().getPolymorphicTypeValidator(),
                        ObjectMapper.DefaultTyping.NON_FINAL);

        RedisCacheConfiguration jsonConfig = RedisCacheConfiguration.defaultCacheConfig()
                .serializeValuesWith(RedisSerializationContext.SerializationPair
                        .fromSerializer(new GenericJackson2JsonRedisSerializer(cacheMapper)))
                .disableCachingNullValues();

        Map<String, RedisCacheConfiguration> perCacheTtl = Map.of(
                "jobs",      jsonConfig.entryTtl(Duration.ofMinutes(60)),
                "users",     jsonConfig.entryTtl(Duration.ofMinutes(15)),
                "templates", jsonConfig.entryTtl(Duration.ofMinutes(5))
        );

        return RedisCacheManager.builder(factory)
                .cacheDefaults(jsonConfig.entryTtl(Duration.ofMinutes(10)))
                .withInitialCacheConfigurations(perCacheTtl)
                .build();
    }

    /**
     * Suppress cache errors so a Redis outage does not take down the application.
     * Overrides CachingConfigurer so Spring's cache AOP actually uses this handler —
     * a bare @Bean is not sufficient; the method must be wired through CachingConfigurer.
     */
    @Override
    public CacheErrorHandler errorHandler() {
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
