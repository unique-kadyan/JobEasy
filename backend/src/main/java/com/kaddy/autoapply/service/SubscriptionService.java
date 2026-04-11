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

    private static final long GOLD_MONTHLY_PAISE     = 32500L;
    private static final long PLATINUM_MONTHLY_PAISE = 50000L;

    private final UserRepository      userRepository;
    private final PaymentRepository   paymentRepository;
    private final FeatureUsageService featureUsageService;
    private final WebClient           razorpayClient;
    private final String              keyId;
    private final String              keySecret;
    private final ObjectMapper        objectMapper;

    public SubscriptionService(UserRepository userRepository,
                               PaymentRepository paymentRepository,
                               FeatureUsageService featureUsageService,
                               WebClient.Builder webClientBuilder,
                               @Value("${app.payment.razorpay.key-id:}") String keyId,
                               @Value("${app.payment.razorpay.key-secret:}") String keySecret,
                               ObjectMapper objectMapper) {
        this.userRepository      = userRepository;
        this.paymentRepository   = paymentRepository;
        this.featureUsageService = featureUsageService;
        this.keyId               = keyId;
        this.keySecret           = keySecret;
        this.objectMapper        = objectMapper;
        this.razorpayClient      = webClientBuilder
                .baseUrl("https://api.razorpay.com/v1")
                .defaultHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                .build();
    }

    public record SubscriptionOrderResponse(
            String orderId, long amount, String currency,
            String keyId, String tier, String billingCycle, String displayPrice) {}

    public record SubscriptionStatus(
            SubscriptionTier tier, boolean isActive) {}

    public SubscriptionStatus getStatus(String userId) {
        User user = findUser(userId);
        SubscriptionTier tier = user.getSubscriptionTier();
        return new SubscriptionStatus(tier, tier != SubscriptionTier.FREE || SecurityUtils.isAdmin());
    }

    public SubscriptionOrderResponse createOrder(String userId, String tierName, String billingCycle) {
        SubscriptionTier tier = parseTier(tierName);
        String cycle = parseBillingCycle(billingCycle);

        if (SecurityUtils.isAdmin()) {
            findUser(userId);
            return new SubscriptionOrderResponse(
                    "admin_bypass_sub_" + userId, 0L, "INR", "", tier.name(), cycle, "Free (Admin)");
        }

        long monthlyPaise = (tier == SubscriptionTier.PLATINUM)
                ? PLATINUM_MONTHLY_PAISE : GOLD_MONTHLY_PAISE;
        int months = cycle.equals("ANNUAL") ? 12 : 6;
        long totalPaise = monthlyPaise * months;

        String receipt = "sub_" + userId.substring(0, Math.min(8, userId.length()))
                + "_" + System.currentTimeMillis();

        Map<String, Object> razorpayOrder = callRazorpayCreateOrder(
                Map.of("amount", totalPaise, "currency", "INR", "receipt", receipt));

        String orderId = Optional.ofNullable((String) razorpayOrder.get("id"))
                .orElseThrow(() -> new BadRequestException("Payment gateway returned no order ID."));

        Payment payment = new Payment();
        payment.setUserId(userId);
        payment.setRazorpayOrderId(orderId);
        payment.setAmount(totalPaise);
        payment.setCurrency("INR");
        payment.setGeneratedResumeId("subscription:" + tier.name() + ":" + cycle);
        paymentRepository.save(payment);

        String cycleLabel = cycle.equals("ANNUAL") ? "Annual" : "Semi-Annual";
        String displayPrice = "₹" + (monthlyPaise / 100) + "/mo · " + cycleLabel;
        return new SubscriptionOrderResponse(orderId, totalPaise, "INR", keyId, tier.name(), cycle, displayPrice);
    }

    public boolean verifyAndActivate(String userId, String orderId, String paymentId,
                                     String signature, String tierName) {

        if (orderId.startsWith("admin_bypass_sub_") || SecurityUtils.isAdmin()) {
            activateTier(userId, parseTier(tierName), "ANNUAL", 0L);
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

        // Extract billing cycle from receipt ref "subscription:TIER:CYCLE"
        String billingCycle = "ANNUAL";
        String ref = payment.getGeneratedResumeId();
        if (ref != null && ref.startsWith("subscription:")) {
            String[] parts = ref.split(":");
            if (parts.length >= 3) billingCycle = parts[2];
        }

        activateTier(userId, parseTier(tierName), billingCycle, payment.getAmount());
        log.info("Subscription {} activated for user {}", tierName, userId);
        return true;
    }

    public FeatureUsageService.RefundEligibility getRefundEligibility(String userId) {
        return featureUsageService.getRefundEligibility(userId);
    }

    public record RefundResult(boolean success, long refundAmountPaise, String message) {}

    public RefundResult requestRefund(String userId) {
        long paise = featureUsageService.requestRefund(userId);
        String msg = "Refund of ₹" + (paise / 100) + " approved. "
                + "Your subscription has been cancelled. "
                + "Amount will be credited within 5-7 business days.";
        log.info("Refund processed for user {}: {}p", userId, paise);
        return new RefundResult(true, paise, msg);
    }

    private void activateTier(String userId, SubscriptionTier tier, String billingCycle, long amountPaise) {
        User user = findUser(userId);
        user.setSubscriptionTier(tier);
        user.setSubscriptionStartDate(LocalDateTime.now());
        user.setSubscriptionAmountPaise(amountPaise);
        user.setSubscriptionBillingCycle(billingCycle);
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

    private String parseBillingCycle(String billingCycle) {
        if (billingCycle == null) return "ANNUAL";
        return switch (billingCycle.toUpperCase()) {
            case "SEMI_ANNUAL", "SEMIANNUAL", "SEMI-ANNUAL" -> "SEMI_ANNUAL";
            default -> "ANNUAL";
        };
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
