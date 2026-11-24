package com.retailflow.modules.returns.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "returns")
public class ReturnRecord {

    @Id
    @Column(length = 36)
    private String id;

    @Column(name = "store_id", nullable = false, length = 36)
    private String storeId = "store-1";

    @Column(name = "sale_id", nullable = false, length = 36)
    private String saleId;

    @Column(name = "return_number", nullable = false, unique = true, length = 50)
    private String returnNumber;

    @Column(name = "invoice_number", nullable = false, length = 50)
    private String invoiceNumber;

    @Column(nullable = false)
    private Instant date = Instant.now();

    @Column(name = "customer_name", nullable = false, length = 100)
    private String customerName;

    @Column(name = "processed_by", nullable = false, length = 100)
    private String processedBy;

    @Column(nullable = false, length = 200)
    private String reason;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(name = "refund_method", nullable = false, length = 30)
    private String refundMethod;

    @Column(name = "refund_reference", nullable = false, length = 100)
    private String refundReference;

    @Column(name = "restock_items")
    private Boolean restockItems = true;

    @Column(name = "total_refund", nullable = false, precision = 12, scale = 2)
    private BigDecimal totalRefund;

    @OneToMany(mappedBy = "returnRecord", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    private List<ReturnItem> items = new ArrayList<>();

    @Column(name = "created_at", updatable = false)
    private Instant createdAt = Instant.now();

    public ReturnRecord() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getStoreId() { return storeId; }
    public void setStoreId(String storeId) { this.storeId = storeId; }
    public String getSaleId() { return saleId; }
    public void setSaleId(String saleId) { this.saleId = saleId; }
    public String getReturnNumber() { return returnNumber; }
    public void setReturnNumber(String returnNumber) { this.returnNumber = returnNumber; }
    public String getInvoiceNumber() { return invoiceNumber; }
    public void setInvoiceNumber(String invoiceNumber) { this.invoiceNumber = invoiceNumber; }
    public Instant getDate() { return date; }
    public void setDate(Instant date) { this.date = date; }
    public String getCustomerName() { return customerName; }
    public void setCustomerName(String customerName) { this.customerName = customerName; }
    public String getProcessedBy() { return processedBy; }
    public void setProcessedBy(String processedBy) { this.processedBy = processedBy; }
    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }
    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
    public String getRefundMethod() { return refundMethod; }
    public void setRefundMethod(String refundMethod) { this.refundMethod = refundMethod; }
    public String getRefundReference() { return refundReference; }
    public void setRefundReference(String refundReference) { this.refundReference = refundReference; }
    public Boolean getRestockItems() { return restockItems; }
    public void setRestockItems(Boolean restockItems) { this.restockItems = restockItems; }
    public BigDecimal getTotalRefund() { return totalRefund; }
    public void setTotalRefund(BigDecimal totalRefund) { this.totalRefund = totalRefund; }
    public List<ReturnItem> getItems() { return items; }
    public void setItems(List<ReturnItem> items) { this.items = items; }
    public Instant getCreatedAt() { return createdAt; }
}
