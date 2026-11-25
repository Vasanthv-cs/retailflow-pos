package com.retailflow.modules.returns.service;

import com.retailflow.common.exception.BusinessException;
import com.retailflow.common.exception.ResourceNotFoundException;
import com.retailflow.common.security.SecurityUtils;
import com.retailflow.modules.catalog.entity.Product;
import com.retailflow.modules.catalog.repository.ProductRepository;
import com.retailflow.modules.inventory.entity.StockMovement;
import com.retailflow.modules.inventory.repository.StockMovementRepository;
import com.retailflow.modules.payments.entity.Payment;
import com.retailflow.modules.payments.repository.PaymentRepository;
import com.retailflow.modules.returns.dto.ReturnDto;
import com.retailflow.modules.returns.entity.ReturnItem;
import com.retailflow.modules.returns.entity.ReturnRecord;
import com.retailflow.modules.returns.repository.ReturnRepository;
import com.retailflow.modules.sales.entity.Sale;
import com.retailflow.modules.sales.entity.SaleItem;
import com.retailflow.modules.sales.repository.SaleRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.Year;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
public class ReturnService {

    private final ReturnRepository returnRepository;
    private final SaleRepository saleRepository;
    private final ProductRepository productRepository;
    private final StockMovementRepository stockMovementRepository;
    private final PaymentRepository paymentRepository;

    public ReturnService(ReturnRepository returnRepository,
                         SaleRepository saleRepository,
                         ProductRepository productRepository,
                         StockMovementRepository stockMovementRepository,
                         PaymentRepository paymentRepository) {
        this.returnRepository = returnRepository;
        this.saleRepository = saleRepository;
        this.productRepository = productRepository;
        this.stockMovementRepository = stockMovementRepository;
        this.paymentRepository = paymentRepository;
    }

    @Transactional
    public ReturnRecord processReturn(ReturnDto.ProcessReturnRequest req) {
        Sale sale = saleRepository.findById(req.getSaleId())
                .orElseThrow(() -> new ResourceNotFoundException("Sale", req.getSaleId()));
        SecurityUtils.assertStoreAccess(sale.getStoreId());

        String returnNumber = "RET-" + Year.now().getValue() + "-" + (1000 + (System.currentTimeMillis() % 9000));
        String refundRef = "REF-" + System.currentTimeMillis() % 100000;

        ReturnRecord returnRecord = new ReturnRecord();
        returnRecord.setId("ret-" + UUID.randomUUID().toString().substring(0, 8));
        returnRecord.setStoreId(sale.getStoreId());
        returnRecord.setSaleId(sale.getId());
        returnRecord.setInvoiceNumber(sale.getInvoiceNumber());
        returnRecord.setReturnNumber(returnNumber);
        returnRecord.setDate(Instant.now());
        returnRecord.setCustomerName(sale.getCustomerName());
        returnRecord.setProcessedBy(req.getProcessedBy() != null ? req.getProcessedBy() : "Staff");
        returnRecord.setReason(req.getReason());
        returnRecord.setNotes(req.getNotes());
        returnRecord.setRefundMethod(req.getRefundMethod());
        returnRecord.setRefundReference(refundRef);
        returnRecord.setRestockItems(true);

        BigDecimal totalRefund = BigDecimal.ZERO;
        List<ReturnItem> returnItems = new ArrayList<>();

        for (ReturnDto.ReturnItemRequest itemReq : req.getItems()) {
            SaleItem saleItem = sale.getItems().stream()
                    .filter(si -> si.getProductId().equals(itemReq.getProductId()))
                    .findFirst()
                    .orElseThrow(() -> new BusinessException("ITEM_NOT_IN_SALE", "Product " + itemReq.getProductId() + " was not in invoice " + sale.getInvoiceNumber()));

            int maxReturnable = saleItem.getQuantity() - (saleItem.getReturnedQuantity() != null ? saleItem.getReturnedQuantity() : 0);
            if (itemReq.getQuantity() > maxReturnable) {
                throw new BusinessException("EXCEEDS_RETURN_LIMIT",
                        "Cannot return " + itemReq.getQuantity() + " units. Max returnable: " + maxReturnable);
            }

            BigDecimal unitRefund = saleItem.getLineTotal().divide(BigDecimal.valueOf(saleItem.getQuantity()), 2, RoundingMode.HALF_UP);
            BigDecimal lineRefund = unitRefund.multiply(BigDecimal.valueOf(itemReq.getQuantity()));
            totalRefund = totalRefund.add(lineRefund);

            ReturnItem returnItem = new ReturnItem();
            returnItem.setId("ri-" + UUID.randomUUID().toString().substring(0, 8));
            returnItem.setReturnRecord(returnRecord);
            returnItem.setProductId(itemReq.getProductId());
            returnItem.setQuantity(itemReq.getQuantity());
            returnItem.setUnitRefund(unitRefund);
            returnItem.setRefundAmount(lineRefund);
            returnItem.setItemCondition(itemReq.getCondition());
            returnItems.add(returnItem);

            // Update returned quantity on sale item
            saleItem.setReturnedQuantity(saleItem.getReturnedQuantity() + itemReq.getQuantity());

            // Restock sellable condition
            Product product = productRepository.findById(itemReq.getProductId()).orElse(null);
            if (product != null) {
                if ("Sellable".equalsIgnoreCase(itemReq.getCondition())) {
                    int prev = product.getStockOnHand() != null ? product.getStockOnHand() : 0;
                    int next = prev + itemReq.getQuantity();
                    product.setStockOnHand(next);
                    productRepository.save(product);

                    StockMovement movement = new StockMovement(
                            "sm-" + UUID.randomUUID().toString().substring(0, 8),
                            product.getId(),
                            "Return",
                            itemReq.getQuantity(),
                            prev,
                            next,
                            returnNumber,
                            returnRecord.getProcessedBy(),
                            product.getLocation(),
                            "Customer return restocked from invoice " + sale.getInvoiceNumber()
                    );
                    stockMovementRepository.save(movement);
                } else {
                    // Damaged: write off without adding to sellable inventory
                    StockMovement movement = new StockMovement(
                            "sm-" + UUID.randomUUID().toString().substring(0, 8),
                            product.getId(),
                            "Adjustment",
                            0,
                            product.getStockOnHand(),
                            product.getStockOnHand(),
                            returnNumber,
                            returnRecord.getProcessedBy(),
                            product.getLocation(),
                            "Damaged customer return written off (not restocked) from invoice " + sale.getInvoiceNumber()
                    );
                    stockMovementRepository.save(movement);
                }
            }
        }

        // Update sale status
        boolean allReturned = sale.getItems().stream()
                .allMatch(si -> si.getQuantity().equals(si.getReturnedQuantity()));
        sale.setStatus(allReturned ? "Returned" : "Partial Return");
        saleRepository.save(sale);

        returnRecord.setTotalRefund(totalRefund);
        returnRecord.setItems(returnItems);
        ReturnRecord savedReturn = returnRepository.save(returnRecord);

        // Record separate refund in payments ledger
        Payment refundPayment = new Payment(
                "pay-" + UUID.randomUUID().toString().substring(0, 8),
                "Refund",
                savedReturn.getId(),
                savedReturn.getReturnNumber(),
                savedReturn.getRefundMethod(),
                totalRefund,
                totalRefund,
                BigDecimal.ZERO,
                refundRef
        );
        paymentRepository.save(refundPayment);

        return savedReturn;
    }

    @Transactional(readOnly = true)
    public List<ReturnRecord> getAllReturns() {
        return returnRepository.findAllByOrderByDateDesc().stream()
                .filter(r -> SecurityUtils.matchesCurrentStore(r.getStoreId()))
                .toList();
    }

    @Transactional(readOnly = true)
    public ReturnRecord getReturnById(String id) {
        ReturnRecord record = returnRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("ReturnRecord", id));
        SecurityUtils.assertStoreAccess(record.getStoreId());
        return record;
    }

    @Transactional(readOnly = true)
    public List<ReturnRecord> getReturnsByInvoiceNumber(String invoiceNumber) {
        return returnRepository.findByInvoiceNumber(invoiceNumber.trim()).stream()
                .filter(r -> SecurityUtils.matchesCurrentStore(r.getStoreId()))
                .toList();
    }
}
