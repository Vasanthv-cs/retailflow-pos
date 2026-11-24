package com.retailflow.modules.returns.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public class ReturnDto {

    public static class ReturnItemRequest {
        @NotNull
        private String productId;
        @NotNull
        private Integer quantity;
        @NotNull
        private String condition; // Sellable, Damaged

        public ReturnItemRequest() {}

        public String getProductId() { return productId; }
        public void setProductId(String productId) { this.productId = productId; }
        public Integer getQuantity() { return quantity; }
        public void setQuantity(Integer quantity) { this.quantity = quantity; }
        public String getCondition() { return condition; }
        public void setCondition(String condition) { this.condition = condition; }
    }

    public static class ProcessReturnRequest {
        @NotNull
        private String saleId;
        @NotEmpty
        private List<ReturnItemRequest> items;
        @NotNull
        private String reason;
        private String notes;
        @NotNull
        private String refundMethod; // Cash, UPI, Card
        private String processedBy = "Staff";

        public ProcessReturnRequest() {}

        public String getSaleId() { return saleId; }
        public void setSaleId(String saleId) { this.saleId = saleId; }
        public List<ReturnItemRequest> getItems() { return items; }
        public void setItems(List<ReturnItemRequest> items) { this.items = items; }
        public String getReason() { return reason; }
        public void setReason(String reason) { this.reason = reason; }
        public String getNotes() { return notes; }
        public void setNotes(String notes) { this.notes = notes; }
        public String getRefundMethod() { return refundMethod; }
        public void setRefundMethod(String refundMethod) { this.refundMethod = refundMethod; }
        public String getProcessedBy() { return processedBy; }
        public void setProcessedBy(String processedBy) { this.processedBy = processedBy; }
    }
}
