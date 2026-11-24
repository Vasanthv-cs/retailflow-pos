package com.retailflow.modules.payments.repository;

import com.retailflow.modules.payments.entity.Payment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PaymentRepository extends JpaRepository<Payment, String> {
    List<Payment> findAllByOrderByDateDesc();
    List<Payment> findByPaymentTypeOrderByDateDesc(String paymentType);
}
