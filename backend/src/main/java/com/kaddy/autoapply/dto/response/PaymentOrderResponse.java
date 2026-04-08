package com.kaddy.autoapply.dto.response;

public record PaymentOrderResponse(
        String orderId,
        long amount,
        String currency,
        String keyId,
        String resumeId,
        String displayPrice,
        String displayCurrency
) {}
