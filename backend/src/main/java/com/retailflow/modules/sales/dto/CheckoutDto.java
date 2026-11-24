package com.retailflow.modules.sales.dto;

import com.retailflow.modules.sales.entity.Sale;
import com.retailflow.modules.sales.entity.SaleItem;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.stream.Collectors;

public class CheckoutDto {

    public static class CartItemRequest {
        @NotNull(message = "Product ID is required")
        private String productId;

        @NotNull(message = "Quantity is required")
        private Integer quantity;

        public CartItemRequest() {}

        public CartItemRequest(String productId, Integer quantity) {
            this.productId = productId;
            this.quantity = quantity;
        }

        public String getProductId() { return productId; }
        public void setProductId(String productId) { this.productId = productId; }
        public Integer getQuantity() { return quantity; }
        public void setQuantity(Integer quantity) { this.quantity = quantity; }
    }

    public static class SplitPaymentItem {
        @NotNull(message = "Payment method is required")
        private String method; // Cash, Card, UPI

        @NotNull(message = "Split amount is required")
        private BigDecimal amount;

        private String reference;

        public SplitPaymentItem() {}

        public SplitPaymentItem(String method, BigDecimal amount, String reference) {
            this.method = method;
            this.amount = amount;
            this.reference = reference;
        }

        public String getMethod() { return method; }
        public void setMethod(String method) { this.method = method; }
        public BigDecimal getAmount() { return amount; }
        public void setAmount(BigDecimal amount) { this.amount = amount; }
        public String getReference() { return reference; }
        public void setReference(String reference) { this.reference = reference; }
    }

    public static class CheckoutRequest {
        @NotEmpty(message = "Cart cannot be empty")
        private List<CartItemRequest> items;

        private String idempotencyKey;
        private String storeId = "store-1";
        private String discountType = "percent";
        private BigDecimal discountValue = BigDecimal.ZERO;
        private String customerName = "Walk-in Customer";
        private String customerPhone;

        @NotNull(message = "Payment method is required")
        private String paymentMethod = "Cash"; // Cash, UPI, Card, Split

        private String paymentReference;
        private BigDecimal amountTendered;
        private String cashierId = "emp-1";

        private List<SplitPaymentItem> splitPayments;

        public CheckoutRequest() {}

        public List<CartItemRequest> getItems() { return items; }
        public void setItems(List<CartItemRequest> items) { this.items = items; }
        public String getIdempotencyKey() { return idempotencyKey; }
        public void setIdempotencyKey(String idempotencyKey) { this.idempotencyKey = idempotencyKey; }
        public String getStoreId() { return storeId; }
        public void setStoreId(String storeId) { this.storeId = storeId; }
        public String getDiscountType() { return discountType; }
        public void setDiscountType(String discountType) { this.discountType = discountType; }
        public BigDecimal getDiscountValue() { return discountValue; }
        public void setDiscountValue(BigDecimal discountValue) { this.discountValue = discountValue; }
        public String getCustomerName() { return customerName; }
        public void setCustomerName(String customerName) { this.customerName = customerName; }
        public String getCustomerPhone() { return customerPhone; }
        public void setCustomerPhone(String customerPhone) { this.customerPhone = customerPhone; }
        public String getPaymentMethod() { return paymentMethod; }
        public void setPaymentMethod(String paymentMethod) { this.paymentMethod = paymentMethod; }
        public String getPaymentReference() { return paymentReference; }
        public void setPaymentReference(String paymentReference) { this.paymentReference = paymentReference; }
        public BigDecimal getAmountTendered() { return amountTendered; }
        public void setAmountTendered(BigDecimal amountTendered) { this.amountTendered = amountTendered; }
        public String getCashierId() { return cashierId; }
        public void setCashierId(String cashierId) { this.cashierId = cashierId; }
        public List<SplitPaymentItem> getSplitPayments() { return splitPayments; }
        public void setSplitPayments(List<SplitPaymentItem> splitPayments) { this.splitPayments = splitPayments; }
    }

    public static class SaleItemDto {
        private String id;
        private String productId;
        private Integer quantity;
        private Integer returnedQuantity;
        private BigDecimal unitPrice;
        private BigDecimal purchasePrice;
        private BigDecimal gstRate;
        private BigDecimal taxAmount;
        private BigDecimal lineTotal;

        public static SaleItemDto fromEntity(SaleItem item) {
            SaleItemDto dto = new SaleItemDto();
            dto.id = item.getId();
            dto.productId = item.getProductId();
            dto.quantity = item.getQuantity();
            dto.returnedQuantity = item.getReturnedQuantity() != null ? item.getReturnedQuantity() : 0;
            dto.unitPrice = item.getUnitPrice();
            dto.purchasePrice = item.getPurchasePrice();
            dto.gstRate = item.getGstRate();
            dto.taxAmount = item.getTaxAmount();
            dto.lineTotal = item.getLineTotal();
            return dto;
        }

        public String getId() { return id; }
        public String getProductId() { return productId; }
        public Integer getQuantity() { return quantity; }
        public Integer getReturnedQuantity() { return returnedQuantity; }
        public BigDecimal getUnitPrice() { return unitPrice; }
        public BigDecimal getPurchasePrice() { return purchasePrice; }
        public BigDecimal getGstRate() { return gstRate; }
        public BigDecimal getTaxAmount() { return taxAmount; }
        public BigDecimal getLineTotal() { return lineTotal; }
    }

    public static class SaleResponseDto {
        private String id;
        private String storeId;
        private String cashierId;
        private String invoiceNumber;
        private String idempotencyKey;
        private Instant date;
        private String customerName;
        private String customerPhone;
        private BigDecimal subtotal;
        private String discountType;
        private BigDecimal discountValue;
        private BigDecimal discountAmount;
        private BigDecimal cgstAmount;
        private BigDecimal sgstAmount;
        private BigDecimal taxAmount;
        private BigDecimal totalAmount;
        private BigDecimal estimatedProfit;
        private String paymentMethod;
        private String paymentReference;
        private BigDecimal amountTendered;
        private BigDecimal changeDue;
        private String status;
        private List<SaleItemDto> items;

        public static SaleResponseDto fromEntity(Sale s) {
            SaleResponseDto dto = new SaleResponseDto();
            dto.id = s.getId();
            dto.storeId = s.getStoreId();
            dto.cashierId = s.getCashierId();
            dto.invoiceNumber = s.getInvoiceNumber();
            dto.idempotencyKey = s.getIdempotencyKey();
            dto.date = s.getDate();
            dto.customerName = s.getCustomerName();
            dto.customerPhone = s.getCustomerPhone();
            dto.subtotal = s.getSubtotal();
            dto.discountType = s.getDiscountType();
            dto.discountValue = s.getDiscountValue();
            dto.discountAmount = s.getDiscountAmount();
            dto.cgstAmount = s.getCgstAmount();
            dto.sgstAmount = s.getSgstAmount();
            dto.taxAmount = s.getTaxAmount();
            dto.totalAmount = s.getTotalAmount();
            dto.estimatedProfit = s.getEstimatedProfit();
            dto.paymentMethod = s.getPaymentMethod();
            dto.paymentReference = s.getPaymentReference();
            dto.amountTendered = s.getAmountTendered();
            dto.changeDue = s.getChangeDue();
            dto.status = s.getStatus();
            if (s.getItems() != null) {
                dto.items = s.getItems().stream().map(SaleItemDto::fromEntity).collect(Collectors.toList());
            }
            return dto;
        }

        public String getId() { return id; }
        public String getStoreId() { return storeId; }
        public String getCashierId() { return cashierId; }
        public String getInvoiceNumber() { return invoiceNumber; }
        public String getIdempotencyKey() { return idempotencyKey; }
        public Instant getDate() { return date; }
        public String getCustomerName() { return customerName; }
        public String getCustomerPhone() { return customerPhone; }
        public BigDecimal getSubtotal() { return subtotal; }
        public String getDiscountType() { return discountType; }
        public BigDecimal getDiscountValue() { return discountValue; }
        public BigDecimal getDiscountAmount() { return discountAmount; }
        public BigDecimal getCgstAmount() { return cgstAmount; }
        public BigDecimal getSgstAmount() { return sgstAmount; }
        public BigDecimal getTaxAmount() { return taxAmount; }
        public BigDecimal getTotalAmount() { return totalAmount; }
        public BigDecimal getEstimatedProfit() { return estimatedProfit; }
        public String getPaymentMethod() { return paymentMethod; }
        public String getPaymentReference() { return paymentReference; }
        public BigDecimal getAmountTendered() { return amountTendered; }
        public BigDecimal getChangeDue() { return changeDue; }
        public String getStatus() { return status; }
        public List<SaleItemDto> getItems() { return items; }
    }
}
