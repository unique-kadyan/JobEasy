package com.kaddy.autoapply.config;

import io.netty.channel.ChannelOption;
import io.netty.handler.timeout.ReadTimeoutHandler;
import io.netty.handler.timeout.WriteTimeoutHandler;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpHeaders;
import org.springframework.http.client.reactive.ReactorClientHttpConnector;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.netty.http.HttpProtocol;
import reactor.netty.http.client.HttpClient;
import reactor.netty.resources.ConnectionProvider;

import java.time.Duration;
import java.util.concurrent.TimeUnit;

@Configuration
public class WebClientConfig {

    static final String BROWSER_UA =
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
            "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

    @Value("${app.webclient.connect-timeout-ms:8000}")
    private int connectTimeoutMs;

    @Value("${app.webclient.read-timeout-s:45}")
    private int readTimeoutS;

    @Value("${app.webclient.write-timeout-s:10}")
    private int writeTimeoutS;

    @Value("${app.webclient.response-timeout-s:50}")
    private int responseTimeoutS;

    @Value("${app.webclient.max-connections:500}")
    private int maxConnections;

    @Bean
    WebClient.Builder webClientBuilder() {
        HttpClient httpClient = buildHttpClient(readTimeoutS)
                .protocol(HttpProtocol.HTTP11);

        return WebClient.builder()
                .clientConnector(new ReactorClientHttpConnector(httpClient))
                .defaultHeader(HttpHeaders.USER_AGENT, BROWSER_UA)
                .defaultHeader(HttpHeaders.ACCEPT, "application/json, text/html, */*")
                .defaultHeader(HttpHeaders.ACCEPT_LANGUAGE, "en-US,en;q=0.9")
                .defaultHeader(HttpHeaders.ACCEPT_ENCODING, "gzip, deflate, br")
                .defaultHeader("Connection", "keep-alive")
                .defaultHeader("Cache-Control", "no-cache");
    }

    private HttpClient buildHttpClient(int readSec) {
        ConnectionProvider pool = ConnectionProvider.builder("kaddy-http-pool")
                .maxConnections(maxConnections)
                .maxIdleTime(Duration.ofSeconds(20))
                .maxLifeTime(Duration.ofMinutes(5))
                .pendingAcquireTimeout(Duration.ofSeconds(10))
                .evictInBackground(Duration.ofSeconds(30))
                .build();

        return HttpClient.create(pool)
                .option(ChannelOption.CONNECT_TIMEOUT_MILLIS, connectTimeoutMs)
                .responseTimeout(Duration.ofSeconds(Math.min(readSec + 5, responseTimeoutS)))
                .doOnConnected(conn -> conn
                        .addHandlerLast(new ReadTimeoutHandler(readSec, TimeUnit.SECONDS))
                        .addHandlerLast(new WriteTimeoutHandler(writeTimeoutS, TimeUnit.SECONDS)));
    }
}
