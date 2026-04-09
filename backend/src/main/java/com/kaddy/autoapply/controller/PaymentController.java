package com.kaddy.autoapply.controller;

import com.kaddy.autoapply.dto.request.PaymentVerifyRequest;
import com.kaddy.autoapply.dto.response.PaymentOrderResponse;
import com.kaddy.autoapply.service.PaymentService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/payments")
@PreAuthorize("hasAnyRole('USER', 'ADMIN')")
public class PaymentController {

    private final PaymentService paymentService;

    public PaymentController(PaymentService paymentService) {
        this.paymentService = paymentService;
    }

    @PostMapping("/create-order")
    public ResponseEntity<PaymentOrderResponse> createOrder(
            @RequestParam String resumeId,
            @RequestParam(required = false) String country,
            Authentication auth) {
        return ResponseEntity.ok(
                paymentService.createOrder((String) auth.getPrincipal(), resumeId, country));
    }

    @PostMapping("/verify")
    public ResponseEntity<Map<String, Boolean>> verify(
            @RequestBody PaymentVerifyRequest request,
            Authentication auth) {
        boolean success = paymentService.verifyAndUnlock((String) auth.getPrincipal(), request);
        return ResponseEntity.ok(Map.of("success", success));
    }
}
