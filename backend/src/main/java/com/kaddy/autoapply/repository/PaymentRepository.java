package com.kaddy.autoapply.repository;

import com.kaddy.autoapply.model.Payment;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;

public interface PaymentRepository extends MongoRepository<Payment, String> {
    Optional<Payment> findByRazorpayOrderId(String razorpayOrderId);
    boolean existsByGeneratedResumeIdAndStatus(String generatedResumeId, String status);
}
