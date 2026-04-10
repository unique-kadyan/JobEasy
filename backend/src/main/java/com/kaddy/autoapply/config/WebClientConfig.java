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

        ConnectionProvider pool = ConnectionProvider.builder("kaddy-http-pool")
                .maxConnections(maxConnections)
                .maxIdleTime(Duration.ofSeconds(20))
                .maxLifeTime(Duration.ofMinutes(5))
                .pendingAcquireTimeout(Duration.ofSeconds(10))
                .evictInBackground(Duration.ofSeconds(30))
                .build();

        HttpClient httpClient = HttpClient.create(pool)

                .option(ChannelOption.CONNECT_TIMEOUT_MILLIS, connectTimeoutMs)

                .responseTimeout(Duration.ofSeconds(responseTimeoutS))

                .doOnConnected(conn -> conn
                        .addHandlerLast(new ReadTimeoutHandler(readTimeoutS, TimeUnit.SECONDS))
                        .addHandlerLast(new WriteTimeoutHandler(writeTimeoutS, TimeUnit.SECONDS)));

        return WebClient.builder()
                .clientConnector(new ReactorClientHttpConnector(httpClient));
    }
}
