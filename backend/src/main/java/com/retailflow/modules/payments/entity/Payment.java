package com.retailflow.modules.payments.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "payments")
public class Payment {

    @Id
    @Column(length = 36)
    private String id;

    @Column(name = "store_id", nullable = false, length = 36)
    private String storeId = "store-1";

    @Column(name = "payment_type", nullable = false, length = 30)
    private String paymentType; // Sale, Refund

    @Column(name = "linked_document_id", nullable = false, length = 36)
    private String linkedDocumentId;

    @Column(name = "linked_document_number", nullable = false, length = 50)
    private String linkedDocumentNumber;

    @Column(nullable = false, length = 30)
    private String method; // Cash, UPI, Card

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal amount;

    @Column(nullable = false)
    private Instant date = Instant.now();

    @Column(name = "amount_tendered", precision = 12, scale = 2)
    private BigDecimal amountTendered;

    @Column(name = "change_due", precision = 12, scale = 2)
    private BigDecimal changeDue;

    @Column(name = "reference_number", length = 100)
    private String referenceNumber;

    @Column(name = "created_at", updatable = false)
    private Instant createdAt = Instant.now();

    public Payment() {}

    public Payment(String id, String paymentType, String linkedDocumentId, String linkedDocumentNumber,
                   String method, BigDecimal amount, BigDecimal amountTendered, BigDecimal changeDue,
                   String referenceNumber) {
        this.id = id;
        this.paymentType = paymentType;
        this.linkedDocumentId = linkedDocumentId;
        this.linkedDocumentNumber = linkedDocumentNumber;
        this.method = method;
        this.amount = amount;
        this.amountTendered = amountTendered;
        this.changeDue = changeDue;
        this.referenceNumber = referenceNumber;
        this.date = Instant.now();
        this.createdAt = Instant.now();
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getStoreId() { return storeId; }
    public void setStoreId(String storeId) { this.storeId = storeId; }
    public String getPaymentType() { return paymentType; }
    public void setPaymentType(String paymentType) { this.paymentType = paymentType; }
    public String getType() { return paymentType; }
    public void setType(String type) { this.paymentType = type; }
    public String getLinkedDocumentId() { return linkedDocumentId; }
    public void setLinkedDocumentId(String linkedDocumentId) { this.linkedDocumentId = linkedDocumentId; }
    public String getLinkedDocumentNumber() { return linkedDocumentNumber; }
    public void setLinkedDocumentNumber(String linkedDocumentNumber) { this.linkedDocumentNumber = linkedDocumentNumber; }
    public String getMethod() { return method; }
    public void setMethod(String method) { this.method = method; }
    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }
    public Instant getDate() { return date; }
    public void setDate(Instant date) { this.date = date; }
    public BigDecimal getAmountTendered() { return amountTendered; }
    public void setAmountTendered(BigDecimal amountTendered) { this.amountTendered = amountTendered; }
    public BigDecimal getChangeDue() { return changeDue; }
    public void setChangeDue(BigDecimal changeDue) { this.changeDue = changeDue; }
    public String getReferenceNumber() { return referenceNumber; }
    public void setReferenceNumber(String referenceNumber) { this.referenceNumber = referenceNumber; }
    public Instant getCreatedAt() { return createdAt; }
}
