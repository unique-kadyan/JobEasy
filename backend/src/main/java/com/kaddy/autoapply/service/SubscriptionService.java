package com.kaddy.autoapply.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.kaddy.autoapply.exception.BadRequestException;
import com.kaddy.autoapply.model.Payment;
import com.kaddy.autoapply.model.User;
import com.kaddy.autoapply.model.enums.SubscriptionTier;
import com.kaddy.autoapply.repository.PaymentRepository;
import com.kaddy.autoapply.repository.UserRepository;
import com.kaddy.autoapply.security.SecurityUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.time.LocalDateTime;
import java.util.HexFormat;
import java.util.Map;
import java.util.Optional;

@Service
@PreAuthorize("hasAnyRole('USER', 'ADMIN')")
public class SubscriptionService {

    private static final Logger log = LoggerFactory.getLogger(SubscriptionService.class);

    // Pricing in paise (100 paise = 1 INR)
    private static final long JOBS_PRICE_PAISE      = 29900L;  // ₹299/month
    private static final long AUTO_APPLY_PRICE_PAISE = 59900L; // ₹599/month

    private final UserRepository    userRepository;
    private final PaymentRepository paymentRepository;
    private final WebClient         razorpayClient;
    private final String            keyId;
    private final String            keySecret;
    private final ObjectMapper      objectMapper;

    public SubscriptionService(UserRepository userRepository,
                               PaymentRepository paymentRepository,
                               WebClient.Builder webClientBuilder,
                               @Value("${app.payment.razorpay.key-id:}") String keyId,
                               @Value("${app.payment.razorpay.key-secret:}") String keySecret,
                               ObjectMapper objectMapper) {
        this.userRepository    = userRepository;
        this.paymentRepository = paymentRepository;
        this.keyId             = keyId;
        this.keySecret         = keySecret;
        this.objectMapper      = objectMapper;
        this.razorpayClient    = webClientBuilder
                .baseUrl("https://api.razorpay.com/v1")
                .defaultHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                .build();
    }

    public record SubscriptionOrderResponse(
            String orderId, long amount, String currency,
            String keyId, String tier, String displayPrice) {}

    public record SubscriptionStatus(
            SubscriptionTier tier, boolean isActive) {}

    public SubscriptionStatus getStatus(String userId) {
        User user = findUser(userId);
        SubscriptionTier tier = user.getSubscriptionTier();
        return new SubscriptionStatus(tier, tier != SubscriptionTier.FREE || SecurityUtils.isAdmin());
    }

    public SubscriptionOrderResponse createOrder(String userId, String tierName) {
        SubscriptionTier tier = parseTier(tierName);

        // Admin bypass
        if (SecurityUtils.isAdmin()) {
            findUser(userId); // validate user exists
            return new SubscriptionOrderResponse(
                    "admin_bypass_sub_" + userId, 0L, "INR", "", tier.name(), "Free (Admin)");
        }

        long amountPaise = (tier == SubscriptionTier.AUTO_APPLY)
                ? AUTO_APPLY_PRICE_PAISE : JOBS_PRICE_PAISE;

        String receipt = "sub_" + userId.substring(0, Math.min(8, userId.length()))
                + "_" + System.currentTimeMillis();

        Map<String, Object> razorpayOrder = callRazorpayCreateOrder(
                Map.of("amount", amountPaise, "currency", "INR", "receipt", receipt));

        String orderId = Optional.ofNullable((String) razorpayOrder.get("id"))
                .orElseThrow(() -> new BadRequestException("Payment gateway returned no order ID."));

        Payment payment = new Payment();
        payment.setUserId(userId);
        payment.setRazorpayOrderId(orderId);
        payment.setAmount(amountPaise);
        payment.setCurrency("INR");
        payment.setGeneratedResumeId("subscription:" + tier.name());
        paymentRepository.save(payment);

        String displayPrice = (tier == SubscriptionTier.AUTO_APPLY) ? "₹599/mo" : "₹299/mo";
        return new SubscriptionOrderResponse(orderId, amountPaise, "INR", keyId, tier.name(), displayPrice);
    }

    public boolean verifyAndActivate(String userId, String orderId, String paymentId,
                                     String signature, String tierName) {
        // Admin bypass
        if (orderId.startsWith("admin_bypass_sub_") || SecurityUtils.isAdmin()) {
            activateTier(userId, parseTier(tierName));
            return true;
        }

        if (!verifySignature(orderId, paymentId, signature)) {
            log.warn("Subscription payment signature verification failed for order {}", orderId);
            throw new BadRequestException("Payment verification failed. Please contact support.");
        }

        Payment payment = paymentRepository.findByRazorpayOrderId(orderId)
                .orElseThrow(() -> new BadRequestException("Order not found."));
        if (!payment.getUserId().equals(userId))
            throw new BadRequestException("Access denied.");

        payment.setRazorpayPaymentId(paymentId);
        payment.setRazorpaySignature(signature);
        payment.setStatus("PAID");
        paymentRepository.save(payment);

        activateTier(userId, parseTier(tierName));
        log.info("Subscription {} activated for user {}", tierName, userId);
        return true;
    }

    // ── helpers ───────────────────────────────────────────────────────────────

    private void activateTier(String userId, SubscriptionTier tier) {
        User user = findUser(userId);
        user.setSubscriptionTier(tier);
        user.setUpdatedAt(LocalDateTime.now());
        userRepository.save(user);
    }

    private SubscriptionTier parseTier(String tierName) {
        try {
            SubscriptionTier tier = SubscriptionTier.valueOf(tierName.toUpperCase());
            if (tier == SubscriptionTier.FREE)
                throw new BadRequestException("Cannot purchase a FREE subscription.");
            return tier;
        } catch (IllegalArgumentException e) {
            throw new BadRequestException("Invalid subscription tier: " + tierName);
        }
    }

    private User findUser(String userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new BadRequestException("User not found."));
    }

    private Map<String, Object> callRazorpayCreateOrder(Map<String, Object> body) {
        if (keyId.isBlank() || keySecret.isBlank()) {
            log.warn("Razorpay keys not configured — returning mock subscription order");
            return Map.of("id", "order_dev_sub_" + System.currentTimeMillis(),
                    "amount", body.get("amount"), "currency", "INR");
        }
        try {
            String credentials = java.util.Base64.getEncoder()
                    .encodeToString((keyId + ":" + keySecret).getBytes(StandardCharsets.UTF_8));
            String responseStr = razorpayClient.post()
                    .uri("/orders")
                    .header(HttpHeaders.AUTHORIZATION, "Basic " + credentials)
                    .bodyValue(body)
                    .retrieve()
                    .bodyToMono(String.class)
                    .block();
            return objectMapper.readValue(responseStr, new TypeReference<Map<String, Object>>() {});
        } catch (Exception e) {
            log.error("Razorpay subscription order creation failed: {}", e.getMessage());
            throw new BadRequestException("Payment gateway error. Please try again.");
        }
    }

    private boolean verifySignature(String orderId, String paymentId, String signature) {
        if (keySecret.isBlank()) return true;
        try {
            String payload = orderId + "|" + paymentId;
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(keySecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] hash = mac.doFinal(payload.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash).equals(signature);
        } catch (GeneralSecurityException e) {
            log.error("Signature verification error: {}", e.getMessage());
            return false;
        }
    }
}
