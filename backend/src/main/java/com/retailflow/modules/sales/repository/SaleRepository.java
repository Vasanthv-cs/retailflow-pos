package com.retailflow.modules.sales.repository;

import com.retailflow.modules.sales.entity.Sale;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Repository
public interface SaleRepository extends JpaRepository<Sale, String> {
    Optional<Sale> findByInvoiceNumber(String invoiceNumber);
    Optional<Sale> findByIdempotencyKey(String idempotencyKey);
    List<Sale> findByCashierIdOrderByDateDesc(String cashierId);
    List<Sale> findByDateBetweenOrderByDateDesc(Instant start, Instant end);
    List<Sale> findAllByOrderByDateDesc();
    Page<Sale> findByDateBetween(Instant start, Instant end, Pageable pageable);
}
