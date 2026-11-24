package com.retailflow.modules.payments.controller;

import com.retailflow.common.api.ApiResponse;
import com.retailflow.modules.payments.entity.Payment;
import com.retailflow.modules.payments.repository.PaymentRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/payments")
public class PaymentController {

    private final PaymentRepository paymentRepository;

    public PaymentController(PaymentRepository paymentRepository) {
        this.paymentRepository = paymentRepository;
    }

    @GetMapping
    public ApiResponse<List<Payment>> getPayments() {
        return ApiResponse.ok(paymentRepository.findAllByOrderByDateDesc());
    }
}
