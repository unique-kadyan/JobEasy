package com.kaddy.autoapply.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.kaddy.autoapply.dto.request.PaymentVerifyRequest;
import com.kaddy.autoapply.dto.response.PaymentOrderResponse;
import com.kaddy.autoapply.exception.BadRequestException;
import com.kaddy.autoapply.model.GeneratedResume;
import com.kaddy.autoapply.model.Payment;
import com.kaddy.autoapply.repository.GeneratedResumeRepository;
import com.kaddy.autoapply.repository.PaymentRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PaymentServiceTest {

    @Mock PaymentRepository paymentRepository;
    @Mock GeneratedResumeRepository generatedResumeRepository;
    @Mock WebClient.Builder webClientBuilder;
    @Mock WebClient webClient;

    private PaymentService devService;
    private ObjectMapper objectMapper = new ObjectMapper();

    private GeneratedResume unpaidResume;
    private GeneratedResume paidResume;

    @BeforeEach
    void setUp() {

        lenient().when(webClientBuilder.baseUrl(anyString())).thenReturn(webClientBuilder);
        lenient().when(webClientBuilder.defaultHeader(anyString(), any(String[].class))).thenReturn(webClientBuilder);
        lenient().when(webClientBuilder.build()).thenReturn(webClient);

        devService = new PaymentService(
                paymentRepository, generatedResumeRepository,
                webClientBuilder, "", "", objectMapper);

        unpaidResume = new GeneratedResume();
        unpaidResume.setId("gr1");
        unpaidResume.setUserId("user1");
        unpaidResume.setPaid(false);

        paidResume = new GeneratedResume();
        paidResume.setId("gr2");
        paidResume.setUserId("user1");
        paidResume.setPaid(true);
    }

    @Test
    void createOrder_shouldReturnOrderWithIndiaPrice() {
        when(generatedResumeRepository.findById("gr1")).thenReturn(Optional.of(unpaidResume));
        when(paymentRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        PaymentOrderResponse response = devService.createOrder("user1", "gr1", "IN");

        assertNotNull(response);
        assertNotNull(response.orderId());
        assertTrue(response.orderId().startsWith("order_dev_"));
        assertEquals(5400L, response.amount());
        assertEquals("INR", response.currency());
        assertEquals("INR", response.displayCurrency());
        assertTrue(response.displayPrice().startsWith("₹"));
        assertEquals("gr1", response.resumeId());
    }

    @Test
    void createOrder_shouldApply25PercentMarkupForNonIndia() {
        when(generatedResumeRepository.findById("gr1")).thenReturn(Optional.of(unpaidResume));
        when(paymentRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        PaymentOrderResponse response = devService.createOrder("user1", "gr1", "US");

        assertEquals(6300L, response.amount());
        assertEquals("US", response.displayCurrency());
    }

    @Test
    void createOrder_shouldTreatNullCountryAsInternational() {
        when(generatedResumeRepository.findById("gr1")).thenReturn(Optional.of(unpaidResume));
        when(paymentRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        // Null country code must NOT silently downgrade to India pricing — use international rate.
        PaymentOrderResponse response = devService.createOrder("user1", "gr1", null);

        assertEquals(6300L, response.amount());
        assertEquals("INR", response.displayCurrency());
    }

    @Test
    void createOrder_shouldPersistPaymentRecord() {
        when(generatedResumeRepository.findById("gr1")).thenReturn(Optional.of(unpaidResume));
        when(paymentRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        devService.createOrder("user1", "gr1", "IN");

        verify(paymentRepository).save(argThat(p ->
                p.getUserId().equals("user1")
                        && p.getGeneratedResumeId().equals("gr1")
                        && p.getAmount() == 5400L));
    }

    @Test
    void createOrder_shouldThrowForUnknownResume() {
        when(generatedResumeRepository.findById("bad")).thenReturn(Optional.empty());

        assertThrows(BadRequestException.class,
                () -> devService.createOrder("user1", "bad", "IN"));
    }

    @Test
    void createOrder_shouldThrowIfResumeBelongsToOtherUser() {
        unpaidResume.setUserId("other-user");
        when(generatedResumeRepository.findById("gr1")).thenReturn(Optional.of(unpaidResume));

        assertThrows(BadRequestException.class,
                () -> devService.createOrder("user1", "gr1", "IN"));
    }

    @Test
    void createOrder_shouldThrowIfAlreadyPaid() {
        when(generatedResumeRepository.findById("gr2")).thenReturn(Optional.of(paidResume));

        assertThrows(BadRequestException.class,
                () -> devService.createOrder("user1", "gr2", "IN"));
    }

    @Test
    void verifyAndUnlock_devMode_shouldSkipSignatureAndUnlockResume() {

        Payment payment = new Payment();
        payment.setRazorpayOrderId("order123");
        payment.setUserId("user1");
        payment.setGeneratedResumeId("gr1");

        when(paymentRepository.findByRazorpayOrderId("order123")).thenReturn(Optional.of(payment));
        when(generatedResumeRepository.findById("gr1")).thenReturn(Optional.of(unpaidResume));
        when(paymentRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(generatedResumeRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        var req = new PaymentVerifyRequest("order123", "pay123", "sig123", "gr1");
        boolean result = devService.verifyAndUnlock("user1", req);

        assertTrue(result);
        verify(generatedResumeRepository).save(argThat(GeneratedResume::isPaid));
        verify(paymentRepository).save(argThat(p -> "PAID".equals(p.getStatus())));
    }

    @Test
    void verifyAndUnlock_shouldThrowForUnknownOrder() {
        when(paymentRepository.findByRazorpayOrderId("bad-order")).thenReturn(Optional.empty());

        var req = new PaymentVerifyRequest("bad-order", "pay1", "sig1", "gr1");
        assertThrows(BadRequestException.class,
                () -> devService.verifyAndUnlock("user1", req));
    }

    @Test
    void verifyAndUnlock_shouldThrowWhenPaymentBelongsToOtherUser() {
        Payment payment = new Payment();
        payment.setRazorpayOrderId("order123");
        payment.setUserId("other-user");

        when(paymentRepository.findByRazorpayOrderId("order123")).thenReturn(Optional.of(payment));

        var req = new PaymentVerifyRequest("order123", "pay1", "sig1", "gr1");
        assertThrows(BadRequestException.class,
                () -> devService.verifyAndUnlock("user1", req));
    }

    @Test
    void createOrder_knownCurrencies_shouldFormatWithSymbol() {
        when(generatedResumeRepository.findById("gr1")).thenReturn(Optional.of(unpaidResume));
        when(paymentRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        PaymentOrderResponse usd = devService.createOrder("user1", "gr1", "USD");
        assertTrue(usd.displayPrice().startsWith("$"), "USD should start with $");

        unpaidResume.setPaid(false);
        PaymentOrderResponse eur = devService.createOrder("user1", "gr1", "EUR");
        assertTrue(eur.displayPrice().startsWith("€"), "EUR should start with €");
    }

    @Test
    void createOrder_unknownCurrency_shouldFallBackToInr() {
        when(generatedResumeRepository.findById("gr1")).thenReturn(Optional.of(unpaidResume));
        when(paymentRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        PaymentOrderResponse response = devService.createOrder("user1", "gr1", "XYZ");

        assertTrue(response.displayPrice().startsWith("₹"),
                "Unknown currency should fall back to INR display");
    }
}
