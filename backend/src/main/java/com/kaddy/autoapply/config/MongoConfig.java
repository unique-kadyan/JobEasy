package com.kaddy.autoapply.config;

import com.mongodb.connection.ClusterSettings;
import com.mongodb.connection.ConnectionPoolSettings;
import com.mongodb.connection.SocketSettings;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.mongodb.autoconfigure.MongoClientSettingsBuilderCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.mongodb.MongoDatabaseFactory;
import org.springframework.data.mongodb.MongoTransactionManager;
import org.springframework.transaction.annotation.EnableTransactionManagement;

import java.util.concurrent.TimeUnit;

@Configuration
@EnableTransactionManagement
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

    @Value("${app.mongodb.cluster.server-selection-timeout-ms:5000}")
    private int serverSelectionTimeoutMs;

    @Value("${app.mongodb.operation-timeout-ms:30000}")
    private int operationTimeoutMs;

    @Bean
    MongoTransactionManager mongoTransactionManager(MongoDatabaseFactory dbFactory) {
        return new MongoTransactionManager(dbFactory);
    }

    @Bean
    MongoClientSettingsBuilderCustomizer mongoPoolCustomizer() {
        return builder -> builder
                .applyToClusterSettings((ClusterSettings.Builder cluster) -> cluster
                        .serverSelectionTimeout(serverSelectionTimeoutMs, TimeUnit.MILLISECONDS))
                .applyToConnectionPoolSettings((ConnectionPoolSettings.Builder pool) -> pool
                        .maxSize(maxPoolSize)
                        .minSize(minPoolSize)
                        .maxWaitTime(maxWaitMs, TimeUnit.MILLISECONDS)
                        .maxConnectionIdleTime(maxIdleMs, TimeUnit.MILLISECONDS))
                .applyToSocketSettings((SocketSettings.Builder socket) -> socket
                        .connectTimeout(connectTimeoutMs, TimeUnit.MILLISECONDS)
                        .readTimeout(readTimeoutMs, TimeUnit.MILLISECONDS))
                // Global timeout for any single MongoDB operation — prevents hung queries
                // from blocking virtual threads during AI refinement loops.
                .timeout(operationTimeoutMs, TimeUnit.MILLISECONDS);
    }
}
