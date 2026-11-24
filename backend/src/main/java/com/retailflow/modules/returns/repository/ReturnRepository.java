package com.retailflow.modules.returns.repository;

import com.retailflow.modules.returns.entity.ReturnRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ReturnRepository extends JpaRepository<ReturnRecord, String> {
    Optional<ReturnRecord> findByReturnNumber(String returnNumber);
    List<ReturnRecord> findBySaleId(String saleId);
    List<ReturnRecord> findByInvoiceNumber(String invoiceNumber);
    List<ReturnRecord> findAllByOrderByDateDesc();
}
