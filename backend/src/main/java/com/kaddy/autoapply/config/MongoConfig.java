package com.kaddy.autoapply.config;

import com.mongodb.MongoClientSettings;
import com.mongodb.connection.ConnectionPoolSettings;
import com.mongodb.connection.SocketSettings;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.mongo.MongoClientSettingsBuilderCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.concurrent.TimeUnit;

@Configuration
public class MongoConfig {

    @Value("${app.mongodb.pool.max-size:100}")
    private int maxPoolSize;

    @Value("${app.mongodb.pool.min-size:10}")
    private int minPoolSize;

    @Value("${app.mongodb.pool.max-wait-ms:5000}")
    private int maxWaitMs;

    @Value("${app.mongodb.pool.max-idle-ms:60000}")
    private int maxIdleMs;

    @Value("${app.mongodb.socket.connect-timeout-ms:5000}")
    private int connectTimeoutMs;

    @Value("${app.mongodb.socket.read-timeout-ms:10000}")
    private int readTimeoutMs;

    @Bean
    MongoClientSettingsBuilderCustomizer mongoPoolCustomizer() {
        return builder -> builder
                .applyToConnectionPoolSettings((ConnectionPoolSettings.Builder pool) -> pool
                        .maxSize(maxPoolSize)
                        .minSize(minPoolSize)
                        .maxWaitTime(maxWaitMs, TimeUnit.MILLISECONDS)
                        .maxConnectionIdleTime(maxIdleMs, TimeUnit.MILLISECONDS))
                .applyToSocketSettings((SocketSettings.Builder socket) -> socket
                        .connectTimeout(connectTimeoutMs, TimeUnit.MILLISECONDS)
                        .readTimeout(readTimeoutMs, TimeUnit.MILLISECONDS));
    }
}
