package com.kaddy.autoapply.config;

import com.mongodb.MongoClientSettings;
import com.mongodb.connection.ConnectionPoolSettings;
import com.mongodb.connection.SocketSettings;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.mongo.MongoClientSettingsBuilderCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.concurrent.TimeUnit;

/**
 * MongoDB connection pool and socket timeout configuration.
 *
 * <h3>Why this matters at scale</h3>
 * <p>The MongoDB Java driver manages its own connection pool independent of the
 * JVM thread pool. The defaults are generous (maxPoolSize=100, no socket timeout),
 * which means:
 * <ul>
 *   <li>Under burst load, the pool can be exhausted, causing new requests to
 *       block indefinitely waiting for a connection.</li>
 *   <li>A MongoDB node that accepts TCP connections but stops responding will
 *       hold threads/virtual-threads parked forever (no socket read timeout).</li>
 * </ul>
 *
 * <h3>Settings</h3>
 * <ul>
 *   <li><b>maxPoolSize</b> — maximum concurrent connections per host. Set to the
 *       expected peak concurrent DB operations. Requests beyond this wait up to
 *       {@code maxWaitTime} before failing fast.</li>
 *   <li><b>minPoolSize</b> — warm connections kept alive, avoiding cold-start
 *       latency on burst traffic.</li>
 *   <li><b>maxWaitTime</b> — how long a thread/virtual-thread waits for a free
 *       connection before receiving a timeout exception (fail-fast).</li>
 *   <li><b>maxConnectionIdleTime</b> — idle connections are closed and removed
 *       from the pool, preventing resource leaks on quiet periods.</li>
 *   <li><b>connectTimeout</b> — TCP handshake deadline for the driver.</li>
 *   <li><b>readTimeout (socketTimeout)</b> — if no data arrives within this
 *       window the operation fails, preventing indefinitely parked threads.</li>
 * </ul>
 */
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

    /**
     * Customizes the MongoDB driver's {@link MongoClientSettings} while letting
     * Spring Boot's auto-configuration handle URI parsing, authentication, and TLS.
     * Spring Boot merges this customizer with its own before building the client.
     */
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
