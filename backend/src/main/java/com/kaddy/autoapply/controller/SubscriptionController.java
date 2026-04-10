package com.kaddy.autoapply.controller;

import com.kaddy.autoapply.service.SubscriptionService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/subscriptions")
@PreAuthorize("hasAnyRole('USER', 'ADMIN')")
public class SubscriptionController {

    private final SubscriptionService subscriptionService;

    public SubscriptionController(SubscriptionService subscriptionService) {
        this.subscriptionService = subscriptionService;
    }

    @GetMapping("/status")
    public ResponseEntity<SubscriptionService.SubscriptionStatus> getStatus(Authentication auth) {
        return ResponseEntity.ok(subscriptionService.getStatus((String) auth.getPrincipal()));
    }

    @PostMapping("/create-order")
    public ResponseEntity<SubscriptionService.SubscriptionOrderResponse> createOrder(
            @RequestParam String tier,
            Authentication auth) {
        return ResponseEntity.ok(subscriptionService.createOrder((String) auth.getPrincipal(), tier));
    }

    @PostMapping("/verify")
    public ResponseEntity<Map<String, Boolean>> verify(
            @RequestBody Map<String, String> body,
            Authentication auth) {
        boolean success = subscriptionService.verifyAndActivate(
                (String) auth.getPrincipal(),
                body.get("razorpayOrderId"),
                body.get("razorpayPaymentId"),
                body.get("razorpaySignature"),
                body.get("tier")
        );
        return ResponseEntity.ok(Map.of("success", success));
    }
}
