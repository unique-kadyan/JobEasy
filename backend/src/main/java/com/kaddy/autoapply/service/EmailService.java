package com.kaddy.autoapply.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.List;
import java.util.Map;

@Service
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);

    private final WebClient resendClient;
    private final WebClient brevoClient;
    private final String resendApiKey;
    private final String resendFrom;
    private final String brevoApiKey;
    private final String brevoFrom;
    private final String frontendUrl;

    public EmailService(
            WebClient.Builder webClientBuilder,
            @Value("${app.email.resend.api-key:}") String resendApiKey,
            @Value("${app.email.resend.from:Auto Apply <onboarding@resend.dev>}") String resendFrom,
            @Value("${app.email.brevo.api-key:}") String brevoApiKey,
            @Value("${app.email.brevo.from:noreply@kaddy.app}") String brevoFrom,
            @Value("${app.frontend-url:http://localhost:3000}") String frontendUrl) {
        this.resendClient = webClientBuilder.baseUrl("https://api.resend.com").build();
        this.brevoClient = webClientBuilder.baseUrl("https://api.brevo.com").build();
        this.resendApiKey = resendApiKey;
        this.resendFrom = resendFrom;
        this.brevoApiKey = brevoApiKey;
        this.brevoFrom = brevoFrom;
        this.frontendUrl = frontendUrl;
    }

    @Async
    public void sendVerificationEmail(String to, String name, String token) {
        String verifyUrl = frontendUrl + "/verify-email?token=" + token;
        String body = """
                <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
                    <h2 style="color:#4F46E5;">Welcome to Kaddy, %s!</h2>
                    <p>Thanks for signing up. Please verify your email address to get started.</p>
                    <a href="%s"
                       style="display:inline-block;background:#4F46E5;color:white;padding:12px 24px;
                              text-decoration:none;border-radius:8px;margin:16px 0;font-weight:bold;">
                        Verify Email
                    </a>
                    <p style="color:#666;font-size:14px;">Or copy this link: %s</p>
                    <p style="color:#999;font-size:12px;">This link expires in 24 hours.</p>
                </div>
                """.formatted(name, verifyUrl, verifyUrl);
        sendHtml(to, "Verify your Kaddy account", body);
    }

    @Async
    public void sendPasswordResetEmail(String to, String name, String token) {
        String resetUrl = frontendUrl + "/reset-password?token=" + token;
        String body = """
                <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
                    <h2 style="color:#4F46E5;">Password Reset</h2>
                    <p>Hi %s, we received a request to reset your password.</p>
                    <a href="%s"
                       style="display:inline-block;background:#4F46E5;color:white;padding:12px 24px;
                              text-decoration:none;border-radius:8px;margin:16px 0;font-weight:bold;">
                        Reset Password
                    </a>
                    <p style="color:#666;font-size:14px;">Or copy this link: %s</p>
                    <p style="color:#999;font-size:12px;">This link expires in 1 hour. If you didn't request this, ignore this email.</p>
                </div>
                """.formatted(name, resetUrl, resetUrl);
        sendHtml(to, "Reset your Kaddy password", body);
    }

    private void sendHtml(String to, String subject, String htmlBody) {
        if (!sendViaResend(to, subject, htmlBody)) {
            sendViaBrevo(to, subject, htmlBody);
        }
    }

    private boolean sendViaResend(String to, String subject, String html) {
        if (!StringUtils.hasText(resendApiKey)) {
            log.debug("Resend API key not configured, skipping");
            return false;
        }
        try {
            Map<String, Object> body = Map.of(
                    "from", resendFrom,
                    "to", List.of(to),
                    "subject", subject,
                    "html", html
            );
            resendClient.post()
                    .uri("/emails")
                    .header("Authorization", "Bearer " + resendApiKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .bodyValue(body)
                    .retrieve()
                    .toBodilessEntity()
                    .block();
            log.info("Email sent via Resend to {}: {}", to, subject);
            return true;
        } catch (Exception e) {
            log.warn("Resend failed for {}: {} — falling back to Brevo", to, e.getMessage());
            return false;
        }
    }

    private boolean sendViaBrevo(String to, String subject, String html) {
        if (!StringUtils.hasText(brevoApiKey)) {
            log.warn("Brevo API key not configured — email to {} not sent", to);
            return false;
        }
        try {
            Map<String, Object> body = Map.of(
                    "sender", Map.of("email", brevoFrom, "name", "Kaddy"),
                    "to", List.of(Map.of("email", to)),
                    "subject", subject,
                    "htmlContent", html
            );
            brevoClient.post()
                    .uri("/v3/smtp/email")
                    .header("api-key", brevoApiKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .bodyValue(body)
                    .retrieve()
                    .toBodilessEntity()
                    .block();
            log.info("Email sent via Brevo to {}: {}", to, subject);
            return true;
        } catch (Exception e) {
            log.error("Brevo also failed for {}: {}", to, e.getMessage());
            return false;
        }
    }
}
