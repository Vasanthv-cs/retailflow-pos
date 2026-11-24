package com.retailflow.modules.sales.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "sales")
public class Sale {

    @Id
    @Column(length = 36)
    private String id;

    @Column(name = "store_id", nullable = false, length = 36)
    private String storeId = "store-1";

    @Column(name = "cashier_id", nullable = false, length = 36)
    private String cashierId;

    @Column(name = "invoice_number", nullable = false, unique = true, length = 50)
    private String invoiceNumber;

    @Column(name = "idempotency_key", length = 100)
    private String idempotencyKey;

    @Column(nullable = false)
    private Instant date = Instant.now();

    @Column(name = "customer_name", nullable = false, length = 100)
    private String customerName = "Walk-in Customer";

    @Column(name = "customer_phone", length = 20)
    private String customerPhone;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal subtotal;

    @Column(name = "discount_type", length = 20)
    private String discountType = "percent";

    @Column(name = "discount_value", precision = 12, scale = 2)
    private BigDecimal discountValue = BigDecimal.ZERO;

    @Column(name = "discount_amount", precision = 12, scale = 2)
    private BigDecimal discountAmount = BigDecimal.ZERO;

    @Column(name = "cgst_amount", precision = 12, scale = 2)
    private BigDecimal cgstAmount = BigDecimal.ZERO;

    @Column(name = "sgst_amount", precision = 12, scale = 2)
    private BigDecimal sgstAmount = BigDecimal.ZERO;

    @Column(name = "tax_amount", precision = 12, scale = 2)
    private BigDecimal taxAmount = BigDecimal.ZERO;

    @Column(name = "total_amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal totalAmount;

    @Column(name = "estimated_profit", precision = 12, scale = 2)
    private BigDecimal estimatedProfit = BigDecimal.ZERO;

    @Column(name = "payment_method", nullable = false, length = 30)
    private String paymentMethod; // Cash, UPI, Card

    @Column(name = "payment_reference", length = 100)
    private String paymentReference;

    @Column(name = "amount_tendered", precision = 12, scale = 2)
    private BigDecimal amountTendered;

    @Column(name = "change_due", precision = 12, scale = 2)
    private BigDecimal changeDue;

    @Column(nullable = false, length = 30)
    private String status = "Completed"; // Completed, Partial Return, Returned

    @OneToMany(mappedBy = "sale", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    private List<SaleItem> items = new ArrayList<>();

    @Column(name = "created_at", updatable = false)
    private Instant createdAt = Instant.now();

    public Sale() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getStoreId() { return storeId; }
    public void setStoreId(String storeId) { this.storeId = storeId; }
    public String getCashierId() { return cashierId; }
    public void setCashierId(String cashierId) { this.cashierId = cashierId; }
    public String getInvoiceNumber() { return invoiceNumber; }
    public void setInvoiceNumber(String invoiceNumber) { this.invoiceNumber = invoiceNumber; }
    public String getIdempotencyKey() { return idempotencyKey; }
    public void setIdempotencyKey(String idempotencyKey) { this.idempotencyKey = idempotencyKey; }
    public Instant getDate() { return date; }
    public void setDate(Instant date) { this.date = date; }
    public String getCustomerName() { return customerName; }
    public void setCustomerName(String customerName) { this.customerName = customerName; }
    public String getCustomerPhone() { return customerPhone; }
    public void setCustomerPhone(String customerPhone) { this.customerPhone = customerPhone; }
    public BigDecimal getSubtotal() { return subtotal; }
    public void setSubtotal(BigDecimal subtotal) { this.subtotal = subtotal; }
    public String getDiscountType() { return discountType; }
    public void setDiscountType(String discountType) { this.discountType = discountType; }
    public BigDecimal getDiscountValue() { return discountValue; }
    public void setDiscountValue(BigDecimal discountValue) { this.discountValue = discountValue; }
    public BigDecimal getDiscountAmount() { return discountAmount; }
    public void setDiscountAmount(BigDecimal discountAmount) { this.discountAmount = discountAmount; }
    public BigDecimal getCgstAmount() { return cgstAmount; }
    public void setCgstAmount(BigDecimal cgstAmount) { this.cgstAmount = cgstAmount; }
    public BigDecimal getSgstAmount() { return sgstAmount; }
    public void setSgstAmount(BigDecimal sgstAmount) { this.sgstAmount = sgstAmount; }
    public BigDecimal getTaxAmount() { return taxAmount; }
    public void setTaxAmount(BigDecimal taxAmount) { this.taxAmount = taxAmount; }
    public BigDecimal getTotalAmount() { return totalAmount; }
    public void setTotalAmount(BigDecimal totalAmount) { this.totalAmount = totalAmount; }
    public BigDecimal getEstimatedProfit() { return estimatedProfit; }
    public void setEstimatedProfit(BigDecimal estimatedProfit) { this.estimatedProfit = estimatedProfit; }
    public String getPaymentMethod() { return paymentMethod; }
    public void setPaymentMethod(String paymentMethod) { this.paymentMethod = paymentMethod; }
    public String getPaymentReference() { return paymentReference; }
    public void setPaymentReference(String paymentReference) { this.paymentReference = paymentReference; }
    public BigDecimal getAmountTendered() { return amountTendered; }
    public void setAmountTendered(BigDecimal amountTendered) { this.amountTendered = amountTendered; }
    public BigDecimal getChangeDue() { return changeDue; }
    public void setChangeDue(BigDecimal changeDue) { this.changeDue = changeDue; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public List<SaleItem> getItems() { return items; }
    public void setItems(List<SaleItem> items) { this.items = items; }
    public Instant getCreatedAt() { return createdAt; }
}
