package com.retailflow.modules.purchases.dto;

import com.retailflow.modules.purchases.entity.PurchaseOrder;
import com.retailflow.modules.purchases.entity.PurchaseOrderItem;
import com.retailflow.modules.purchases.entity.PurchaseOrderStatus;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

public class PurchaseDtos {

    public static class CreateOrderItemRequest {
        @NotNull
        private String productId;
        @NotNull
        private Integer quantity;
        @NotNull
        private BigDecimal unitCost;
        @NotNull
        private BigDecimal gstRate;

        public CreateOrderItemRequest() {}

        public String getProductId() { return productId; }
        public void setProductId(String productId) { this.productId = productId; }
        public Integer getQuantity() { return quantity; }
        public void setQuantity(Integer quantity) { this.quantity = quantity; }
        public BigDecimal getUnitCost() { return unitCost; }
        public void setUnitCost(BigDecimal unitCost) { this.unitCost = unitCost; }
        public BigDecimal getGstRate() { return gstRate; }
        public void setGstRate(BigDecimal gstRate) { this.gstRate = gstRate; }
    }

    public static class CreatePurchaseOrderRequest {
        @NotNull
        private String supplierId;
        @NotNull
        private LocalDate expectedDate;
        private String notes;
        private PurchaseOrderStatus status = PurchaseOrderStatus.ORDERED;

        @NotEmpty
        private List<CreateOrderItemRequest> items;

        public CreatePurchaseOrderRequest() {}

        public String getSupplierId() { return supplierId; }
        public void setSupplierId(String supplierId) { this.supplierId = supplierId; }
        public LocalDate getExpectedDate() { return expectedDate; }
        public void setExpectedDate(LocalDate expectedDate) { this.expectedDate = expectedDate; }
        public String getNotes() { return notes; }
        public void setNotes(String notes) { this.notes = notes; }
        public PurchaseOrderStatus getStatus() { return status; }
        public void setStatus(PurchaseOrderStatus status) { this.status = status; }
        public List<CreateOrderItemRequest> getItems() { return items; }
        public void setItems(List<CreateOrderItemRequest> items) { this.items = items; }
    }

    public static class ReceiveItemRequest {
        @NotNull
        private String productId;
        @NotNull
        private Integer quantityReceived;

        public ReceiveItemRequest() {}

        public ReceiveItemRequest(String productId, Integer quantityReceived) {
            this.productId = productId;
            this.quantityReceived = quantityReceived;
        }

        public String getProductId() { return productId; }
        public void setProductId(String productId) { this.productId = productId; }
        public Integer getQuantityReceived() { return quantityReceived; }
        public void setQuantityReceived(Integer quantityReceived) { this.quantityReceived = quantityReceived; }
    }

    public static class ReceiveGoodsRequest {
        private String receivedBy = "Store Manager";
        private List<ReceiveItemRequest> items; // optional: if null or empty, receives all remaining quantities

        public ReceiveGoodsRequest() {}

        public String getReceivedBy() { return receivedBy; }
        public void setReceivedBy(String receivedBy) { this.receivedBy = receivedBy; }
        public List<ReceiveItemRequest> getItems() { return items; }
        public void setItems(List<ReceiveItemRequest> items) { this.items = items; }
    }

    public static class PurchaseOrderItemDto {
        private String id;
        private String productId;
        private int quantity;
        private int receivedQuantity;
        private BigDecimal unitCost;
        private BigDecimal gstRate;
        private BigDecimal totalCost;

        public static PurchaseOrderItemDto fromEntity(PurchaseOrderItem item) {
            PurchaseOrderItemDto dto = new PurchaseOrderItemDto();
            dto.id = item.getId();
            dto.productId = item.getProductId();
            dto.quantity = item.getQuantity();
            dto.receivedQuantity = item.getReceivedQuantity();
            dto.unitCost = item.getUnitCost();
            dto.gstRate = item.getGstRate();
            dto.totalCost = item.getTotalCost();
            return dto;
        }

        public String getId() { return id; }
        public String getProductId() { return productId; }
        public int getQuantity() { return quantity; }
        public int getReceivedQuantity() { return receivedQuantity; }
        public BigDecimal getUnitCost() { return unitCost; }
        public BigDecimal getGstRate() { return gstRate; }
        public BigDecimal getTotalCost() { return totalCost; }
    }

    public static class PurchaseOrderDto {
        private String id;
        private String poNumber;
        private String supplierId;
        private String supplierName;
        private LocalDate orderDate;
        private LocalDate expectedDate;
        private LocalDate receivedDate;
        private String receivedBy;
        private String status;
        private BigDecimal totalAmount;
        private String notes;
        private List<PurchaseOrderItemDto> items;

        public static PurchaseOrderDto fromEntity(PurchaseOrder po, String supplierName) {
            PurchaseOrderDto dto = new PurchaseOrderDto();
            dto.id = po.getId();
            dto.poNumber = po.getPoNumber();
            dto.supplierId = po.getSupplierId();
            dto.supplierName = supplierName;
            dto.orderDate = po.getOrderDate();
            dto.expectedDate = po.getExpectedDate();
            dto.receivedDate = po.getReceivedDate();
            dto.receivedBy = po.getReceivedBy();
            dto.status = po.getStatus().name();
            dto.totalAmount = po.getTotalAmount();
            dto.notes = po.getNotes();
            dto.items = po.getItems().stream()
                    .map(PurchaseOrderItemDto::fromEntity)
                    .collect(Collectors.toList());
            return dto;
        }

        public String getId() { return id; }
        public String getPoNumber() { return poNumber; }
        public String getSupplierId() { return supplierId; }
        public String getSupplierName() { return supplierName; }
        public LocalDate getOrderDate() { return orderDate; }
        public LocalDate getExpectedDate() { return expectedDate; }
        public LocalDate getReceivedDate() { return receivedDate; }
        public String getReceivedBy() { return receivedBy; }
        public String getStatus() { return status; }
        public BigDecimal getTotalAmount() { return totalAmount; }
        public String getNotes() { return notes; }
        public List<PurchaseOrderItemDto> getItems() { return items; }
    }
}
