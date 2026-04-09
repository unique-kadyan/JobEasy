package com.kaddy.autoapply.config;

import io.netty.channel.ChannelOption;
import io.netty.handler.timeout.ReadTimeoutHandler;
import io.netty.handler.timeout.WriteTimeoutHandler;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.reactive.ReactorClientHttpConnector;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.netty.http.client.HttpClient;
import reactor.netty.resources.ConnectionProvider;

import java.time.Duration;
import java.util.concurrent.TimeUnit;

/**
 * WebClient configuration with production-grade timeouts and a bounded connection pool.
 *
 * <h3>Why timeouts matter at scale</h3>
 * <p>Without explicit timeouts a single slow external service (job board, AI API,
 * email relay) can hold a virtual thread parked indefinitely. At millions of concurrent
 * users, thousands of such threads accumulate, eventually exhausting the connection
 * pool and causing cascading 503s across unrelated requests.
 *
 * <h3>Four timeout layers</h3>
 * <ol>
 *   <li><b>Connect timeout</b> — TCP handshake must complete within
 *       {@code app.webclient.connect-timeout-ms} (default 5 s). Guards against
 *       unreachable hosts.</li>
 *   <li><b>Write timeout</b> — the outbound request must finish writing within
 *       {@code app.webclient.write-timeout-s} (default 5 s). Guards against
 *       stalled uploads.</li>
 *   <li><b>Read timeout</b> — the server must send data within
 *       {@code app.webclient.read-timeout-s} (default 10 s) of the last byte
 *       received. Guards against servers that accept but never respond.</li>
 *   <li><b>Response timeout</b> — the entire request/response cycle must complete
 *       within {@code app.webclient.response-timeout-s} (default 15 s). This is the
 *       end-to-end SLA for any outbound HTTP call.</li>
 * </ol>
 *
 * <h3>Bounded connection pool</h3>
 * <p>Reactor-Netty's default pool is unbounded. Under load this allows unlimited
 * connection leaks when the remote side is slow. The pool here is capped at
 * {@code app.webclient.max-connections} (default 500), with idle eviction and a
 * {@code pendingAcquireTimeout} that returns an error instead of queuing forever.
 */
@Configuration
public class WebClientConfig {

    @Value("${app.webclient.connect-timeout-ms:5000}")
    private int connectTimeoutMs;

    @Value("${app.webclient.read-timeout-s:10}")
    private int readTimeoutS;

    @Value("${app.webclient.write-timeout-s:5}")
    private int writeTimeoutS;

    @Value("${app.webclient.response-timeout-s:15}")
    private int responseTimeoutS;

    @Value("${app.webclient.max-connections:500}")
    private int maxConnections;

    @Bean
    WebClient.Builder webClientBuilder() {
        // Bounded, evicting Netty connection pool
        ConnectionProvider pool = ConnectionProvider.builder("kaddy-http-pool")
                .maxConnections(maxConnections)
                .maxIdleTime(Duration.ofSeconds(20))        // evict idle connections
                .maxLifeTime(Duration.ofMinutes(5))         // rotate long-lived connections
                .pendingAcquireTimeout(Duration.ofSeconds(10)) // fail fast if pool exhausted
                .evictInBackground(Duration.ofSeconds(30))  // background cleanup thread
                .build();

        HttpClient httpClient = HttpClient.create(pool)
                // Layer 1 — TCP connect timeout
                .option(ChannelOption.CONNECT_TIMEOUT_MILLIS, connectTimeoutMs)
                // Layer 2 — end-to-end response timeout
                .responseTimeout(Duration.ofSeconds(responseTimeoutS))
                // Layers 3 & 4 — Netty pipeline read/write timeouts
                .doOnConnected(conn -> conn
                        .addHandlerLast(new ReadTimeoutHandler(readTimeoutS, TimeUnit.SECONDS))
                        .addHandlerLast(new WriteTimeoutHandler(writeTimeoutS, TimeUnit.SECONDS)));

        return WebClient.builder()
                .clientConnector(new ReactorClientHttpConnector(httpClient));
    }
}
