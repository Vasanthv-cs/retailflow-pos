package com.retailflow.modules.realtime;

import java.time.Instant;

public class RealtimeEvent<T> {

    private String eventType;
    private String storeId;
    private Instant timestamp;
    private T data;

    public RealtimeEvent() {}

    public RealtimeEvent(String eventType, String storeId, T data) {
        this.eventType = eventType;
        this.storeId = storeId != null ? storeId : "store-1";
        this.timestamp = Instant.now();
        this.data = data;
    }

    public String getEventType() { return eventType; }
    public void setEventType(String eventType) { this.eventType = eventType; }
    public String getStoreId() { return storeId; }
    public void setStoreId(String storeId) { this.storeId = storeId; }
    public Instant getTimestamp() { return timestamp; }
    public void setTimestamp(Instant timestamp) { this.timestamp = timestamp; }
    public T getData() { return data; }
    public void setData(T data) { this.data = data; }

    public static class InventoryChangePayload {
        private String storeId = "store-1";
        private String productId;
        private String sku;
        private String productName;
        private int quantityChange;
        private int previousStock;
        private int newStockOnHand;
        private int lowStockThreshold;
        private boolean isLowStock;
        private String performedBy;
        private String reason;

        public InventoryChangePayload() {}

        public InventoryChangePayload(String productId, String sku, String productName, int quantityChange,
                                     int previousStock, int newStockOnHand, int lowStockThreshold,
                                     String performedBy, String reason) {
            this.productId = productId;
            this.sku = sku;
            this.productName = productName;
            this.quantityChange = quantityChange;
            this.previousStock = previousStock;
            this.newStockOnHand = newStockOnHand;
            this.lowStockThreshold = lowStockThreshold;
            this.isLowStock = newStockOnHand <= lowStockThreshold;
            this.performedBy = performedBy;
            this.reason = reason;
        }

        public String getStoreId() { return storeId; }
        public void setStoreId(String storeId) { this.storeId = storeId != null ? storeId : "store-1"; }
        public String getProductId() { return productId; }
        public String getSku() { return sku; }
        public String getProductName() { return productName; }
        public int getQuantityChange() { return quantityChange; }
        public int getPreviousStock() { return previousStock; }
        public int getNewStockOnHand() { return newStockOnHand; }
        public int getLowStockThreshold() { return lowStockThreshold; }
        public boolean isLowStock() { return isLowStock; }
        public String getPerformedBy() { return performedBy; }
        public String getReason() { return reason; }
    }

    public static class NewSalePayload {
        private String storeId = "store-1";
        private String saleId;
        private String invoiceNumber;
        private String cashierId;
        private String customerName;
        private java.math.BigDecimal totalAmount;
        private int itemCount;
        private String paymentMethod;
        private Instant date;

        public NewSalePayload() {}

        public NewSalePayload(String saleId, String invoiceNumber, String cashierId, String customerName,
                             java.math.BigDecimal totalAmount, int itemCount, String paymentMethod, Instant date) {
            this.saleId = saleId;
            this.invoiceNumber = invoiceNumber;
            this.cashierId = cashierId;
            this.customerName = customerName;
            this.totalAmount = totalAmount;
            this.itemCount = itemCount;
            this.paymentMethod = paymentMethod;
            this.date = date;
        }

        public String getStoreId() { return storeId; }
        public void setStoreId(String storeId) { this.storeId = storeId != null ? storeId : "store-1"; }
        public String getSaleId() { return saleId; }
        public String getInvoiceNumber() { return invoiceNumber; }
        public String getCashierId() { return cashierId; }
        public String getCustomerName() { return customerName; }
        public java.math.BigDecimal getTotalAmount() { return totalAmount; }
        public int getItemCount() { return itemCount; }
        public String getPaymentMethod() { return paymentMethod; }
        public Instant getDate() { return date; }
    }

    public static class LowStockAlertPayload {
        private String storeId = "store-1";
        private String productId;
        private String sku;
        private String productName;
        private int stockOnHand;
        private int threshold;
        private String location;

        public LowStockAlertPayload() {}

        public LowStockAlertPayload(String productId, String sku, String productName, int stockOnHand, int threshold, String location) {
            this.productId = productId;
            this.sku = sku;
            this.productName = productName;
            this.stockOnHand = stockOnHand;
            this.threshold = threshold;
            this.location = location;
        }

        public String getStoreId() { return storeId; }
        public void setStoreId(String storeId) { this.storeId = storeId != null ? storeId : "store-1"; }
        public String getProductId() { return productId; }
        public String getSku() { return sku; }
        public String getProductName() { return productName; }
        public int getStockOnHand() { return stockOnHand; }
        public int getThreshold() { return threshold; }
        public String getLocation() { return location; }
    }

    public static class PurchaseOrderUpdatePayload {
        private String storeId = "store-1";
        private String poId;
        private String poNumber;
        private String supplierName;
        private String status;
        private String receivedBy;
        private java.math.BigDecimal totalAmount;

        public PurchaseOrderUpdatePayload() {}

        public PurchaseOrderUpdatePayload(String poId, String poNumber, String supplierName, String status, String receivedBy, java.math.BigDecimal totalAmount) {
            this.poId = poId;
            this.poNumber = poNumber;
            this.supplierName = supplierName;
            this.status = status;
            this.receivedBy = receivedBy;
            this.totalAmount = totalAmount;
        }

        public String getPoId() { return poId; }
        public String getPoNumber() { return poNumber; }
        public String getSupplierName() { return supplierName; }
        public String getStatus() { return status; }
        public String getReceivedBy() { return receivedBy; }
        public java.math.BigDecimal getTotalAmount() { return totalAmount; }
    }
}
