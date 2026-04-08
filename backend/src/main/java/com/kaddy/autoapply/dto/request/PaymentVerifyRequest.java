package com.kaddy.autoapply.dto.request;

public record PaymentVerifyRequest(
        String razorpayOrderId,
        String razorpayPaymentId,
        String razorpaySignature,
        String resumeId
) {}
