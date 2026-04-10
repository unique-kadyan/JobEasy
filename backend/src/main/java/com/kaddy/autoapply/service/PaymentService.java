package com.kaddy.autoapply.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.kaddy.autoapply.dto.request.PaymentVerifyRequest;
import com.kaddy.autoapply.dto.response.PaymentOrderResponse;
import com.kaddy.autoapply.exception.BadRequestException;
import com.kaddy.autoapply.security.SecurityUtils;
import com.kaddy.autoapply.model.GeneratedResume;
import com.kaddy.autoapply.model.Payment;
import com.kaddy.autoapply.repository.GeneratedResumeRepository;
import com.kaddy.autoapply.repository.PaymentRepository;
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
import java.util.HexFormat;
import java.util.Map;
import java.util.Optional;

@Service
@PreAuthorize("hasAnyRole('USER', 'ADMIN')")
public class PaymentService {

    private static final Logger log = LoggerFactory.getLogger(PaymentService.class);

    private static final long PRICE_INDIA_PAISE = 5400L;
    private static final long PRICE_OTHERS_PAISE = 6300L;

    private static final Map<String, double[]> CURRENCY_RATES = Map.of(
            "USD", new double[]{83.0, 0.76},
            "EUR", new double[]{90.0, 0.70},
            "GBP", new double[]{105.0, 0.60},
            "AED", new double[]{22.6, 2.79},
            "SGD", new double[]{62.0, 1.02},
            "AUD", new double[]{54.0, 1.17},
            "CAD", new double[]{61.0, 1.03}
    );

    private final PaymentRepository paymentRepository;
    private final GeneratedResumeRepository generatedResumeRepository;
    private final WebClient razorpayClient;
    private final String keyId;
    private final String keySecret;
    private final ObjectMapper objectMapper;

    public PaymentService(PaymentRepository paymentRepository,
                          GeneratedResumeRepository generatedResumeRepository,
                          WebClient.Builder webClientBuilder,
                          @Value("${app.payment.razorpay.key-id:}") String keyId,
                          @Value("${app.payment.razorpay.key-secret:}") String keySecret,
                          ObjectMapper objectMapper) {
        this.paymentRepository = paymentRepository;
        this.generatedResumeRepository = generatedResumeRepository;
        this.keyId = keyId;
        this.keySecret = keySecret;
        this.objectMapper = objectMapper;
        this.razorpayClient = webClientBuilder
                .baseUrl("https://api.razorpay.com/v1")
                .defaultHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                .build();
    }

    public PaymentOrderResponse createOrder(String userId, String resumeId, String countryCode) {
        GeneratedResume resume = generatedResumeRepository.findById(resumeId)
                .orElseThrow(() -> new BadRequestException("Generated resume not found."));
        if (!resume.getUserId().equals(userId) && !SecurityUtils.isAdmin())
            throw new BadRequestException("Access denied.");

        if (SecurityUtils.isAdmin()) {
            if (!resume.isPaid()) {
                resume.setPaid(true);
                generatedResumeRepository.save(resume);
            }
            return new PaymentOrderResponse("admin_bypass_" + resumeId, 0L, "INR", "",
                    resumeId, "Free (Admin)", "INR");
        }

        if (resume.isPaid()) throw new BadRequestException("This resume is already unlocked.");

        boolean isIndia = "IN".equalsIgnoreCase(countryCode) || countryCode == null;
        long amountPaise = isIndia ? PRICE_INDIA_PAISE : PRICE_OTHERS_PAISE;

        String receipt = "kaddy_" + userId.substring(0, Math.min(8, userId.length())) + "_" + System.currentTimeMillis();

        Map<String, Object> orderBody = Map.of(
                "amount", amountPaise,
                "currency", "INR",
                "receipt", receipt
        );

        Map<String, Object> razorpayOrder = callRazorpayCreateOrder(orderBody);
        String orderId = Optional.ofNullable((String) razorpayOrder.get("id"))
                .orElseThrow(() -> new BadRequestException("Payment gateway returned no order ID."));

        Payment payment = new Payment();
        payment.setUserId(userId);
        payment.setRazorpayOrderId(orderId);
        payment.setAmount(amountPaise);
        payment.setCurrency("INR");
        payment.setGeneratedResumeId(resumeId);
        paymentRepository.save(payment);

        String displayPrice = formatDisplayPrice(amountPaise, countryCode);
        String displayCurrency = isIndia ? "INR" : Optional.ofNullable(countryCode).orElse("INR");

        return new PaymentOrderResponse(orderId, amountPaise, "INR", keyId,
                resumeId, displayPrice, displayCurrency);
    }

    public boolean verifyAndUnlock(String userId, PaymentVerifyRequest req) {
        if (!verifySignature(req.razorpayOrderId(), req.razorpayPaymentId(), req.razorpaySignature())) {
            log.warn("Payment signature verification failed for order {}", req.razorpayOrderId());
            throw new BadRequestException("Payment verification failed. Please contact support.");
        }

        Payment payment = paymentRepository.findByRazorpayOrderId(req.razorpayOrderId())
                .orElseThrow(() -> new BadRequestException("Order not found."));

        if (!payment.getUserId().equals(userId) && !SecurityUtils.isAdmin())
            throw new BadRequestException("Access denied.");

        payment.setRazorpayPaymentId(req.razorpayPaymentId());
        payment.setRazorpaySignature(req.razorpaySignature());
        payment.setStatus("PAID");
        paymentRepository.save(payment);

        GeneratedResume resume = generatedResumeRepository.findById(req.resumeId())
                .orElseThrow(() -> new BadRequestException("Resume not found."));
        resume.setPaid(true);
        resume.setPaymentId(req.razorpayPaymentId());
        generatedResumeRepository.save(resume);

        log.info("Payment verified and resume {} unlocked for user {}", req.resumeId(), userId);
        return true;
    }

    private Map<String, Object> callRazorpayCreateOrder(Map<String, Object> body) {
        if (keyId.isBlank() || keySecret.isBlank()) {
            throw new BadRequestException("Payment gateway is not configured. Please contact support.");
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
        } catch (com.fasterxml.jackson.core.JsonProcessingException | RuntimeException e) {
            log.error("Razorpay order creation failed: {}", e.getMessage());
            throw new BadRequestException("Payment gateway error. Please try again.");
        }
    }

    private boolean verifySignature(String orderId, String paymentId, String signature) {
        if (keySecret.isBlank()) {
            log.error("Cannot verify payment signature: Razorpay key secret is not configured");
            return false;
        }
        try {
            String payload = orderId + "|" + paymentId;
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(keySecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] hash = mac.doFinal(payload.getBytes(StandardCharsets.UTF_8));
            String computed = HexFormat.of().formatHex(hash);
            return computed.equals(signature);
        } catch (GeneralSecurityException e) {
            log.error("Signature verification error: {}", e.getMessage());
            return false;
        }
    }

    private String formatDisplayPrice(long paise, String countryCode) {
        double inr = paise / 100.0;
        if (countryCode == null || "IN".equalsIgnoreCase(countryCode)) {
            return String.format("₹%.0f", inr);
        }
        double[] rate = CURRENCY_RATES.get(countryCode.toUpperCase());
        if (rate == null) return String.format("₹%.0f", inr);
        double foreign = inr / rate[0];
        String symbol = currencySymbol(countryCode);
        return String.format("%s%.2f", symbol, foreign);
    }

    private String currencySymbol(String code) {
        return switch (code.toUpperCase()) {
            case "USD" -> "$";
            case "EUR" -> "€";
            case "GBP" -> "£";
            case "AED" -> "AED ";
            case "SGD" -> "S$";
            case "AUD" -> "A$";
            case "CAD" -> "C$";
            default -> code + " ";
        };
    }
}
