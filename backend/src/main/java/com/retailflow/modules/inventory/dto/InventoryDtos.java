package com.retailflow.modules.inventory.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

public class InventoryDtos {

    public static class InventoryRecord {
        private String productId;
        private String storeId;
        private String sku;
        private String barcode;
        private String productName;
        private String location;
        private int quantityOnHand;
        private int minimumStockLevel;
        private BigDecimal unitCost;
        private BigDecimal unitPrice;
        private BigDecimal valuationCost;
        private BigDecimal valuationRetail;
        private String stockStatus; // Healthy, Low Stock, Out of Stock

        public InventoryRecord() {}

        public InventoryRecord(String productId, String storeId, String sku, String barcode, String productName,
                               String location, int quantityOnHand, int minimumStockLevel, BigDecimal unitCost,
                               BigDecimal unitPrice, BigDecimal valuationCost, BigDecimal valuationRetail,
                               String stockStatus) {
            this.productId = productId;
            this.storeId = storeId;
            this.sku = sku;
            this.barcode = barcode;
            this.productName = productName;
            this.location = location;
            this.quantityOnHand = quantityOnHand;
            this.minimumStockLevel = minimumStockLevel;
            this.unitCost = unitCost;
            this.unitPrice = unitPrice;
            this.valuationCost = valuationCost;
            this.valuationRetail = valuationRetail;
            this.stockStatus = stockStatus;
        }

        public String getProductId() { return productId; }
        public String getStoreId() { return storeId; }
        public String getSku() { return sku; }
        public String getBarcode() { return barcode; }
        public String getProductName() { return productName; }
        public String getLocation() { return location; }
        public int getQuantityOnHand() { return quantityOnHand; }
        public int getMinimumStockLevel() { return minimumStockLevel; }
        public BigDecimal getUnitCost() { return unitCost; }
        public BigDecimal getUnitPrice() { return unitPrice; }
        public BigDecimal getValuationCost() { return valuationCost; }
        public BigDecimal getValuationRetail() { return valuationRetail; }
        public String getStockStatus() { return stockStatus; }
    }

    public static class StockAdjustmentRequest {
        @NotBlank(message = "Product ID is required")
        private String productId;

        @NotNull(message = "Delta is required")
        private Integer delta;

        @NotBlank(message = "Reason for adjustment is required")
        private String reason;

        private String performedBy = "Staff";

        public StockAdjustmentRequest() {}

        public String getProductId() { return productId; }
        public void setProductId(String productId) { this.productId = productId; }
        public Integer getDelta() { return delta; }
        public void setDelta(Integer delta) { this.delta = delta; }
        public String getReason() { return reason; }
        public void setReason(String reason) { this.reason = reason; }
        public String getPerformedBy() { return performedBy; }
        public void setPerformedBy(String performedBy) { this.performedBy = performedBy; }
    }

    public static class StockTransferRequest {
        @NotBlank(message = "Product ID is required")
        private String productId;

        @NotBlank(message = "Destination location is required")
        private String toLocation;

        @NotNull(message = "Quantity is required")
        private Integer quantity;

        private String note;
        private String performedBy = "Staff";

        public StockTransferRequest() {}

        public String getProductId() { return productId; }
        public void setProductId(String productId) { this.productId = productId; }
        public String getToLocation() { return toLocation; }
        public void setToLocation(String toLocation) { this.toLocation = toLocation; }
        public Integer getQuantity() { return quantity; }
        public void setQuantity(Integer quantity) { this.quantity = quantity; }
        public String getNote() { return note; }
        public void setNote(String note) { this.note = note; }
        public String getPerformedBy() { return performedBy; }
        public void setPerformedBy(String performedBy) { this.performedBy = performedBy; }
    }

    public static class InventoryValuationSummary {
        private BigDecimal totalCostValuation;
        private BigDecimal totalRetailValuation;
        private BigDecimal potentialProfit;
        private int totalProducts;
        private int totalUnitsInStock;
        private int lowStockCount;
        private int outOfStockCount;
        private int healthyStockCount;

        public InventoryValuationSummary() {}

        public InventoryValuationSummary(BigDecimal totalCostValuation, BigDecimal totalRetailValuation,
                                        BigDecimal potentialProfit, int totalProducts, int totalUnitsInStock,
                                        int lowStockCount, int outOfStockCount, int healthyStockCount) {
            this.totalCostValuation = totalCostValuation;
            this.totalRetailValuation = totalRetailValuation;
            this.potentialProfit = potentialProfit;
            this.totalProducts = totalProducts;
            this.totalUnitsInStock = totalUnitsInStock;
            this.lowStockCount = lowStockCount;
            this.outOfStockCount = outOfStockCount;
            this.healthyStockCount = healthyStockCount;
        }

        public BigDecimal getTotalCostValuation() { return totalCostValuation; }
        public BigDecimal getTotalRetailValuation() { return totalRetailValuation; }
        public BigDecimal getPotentialProfit() { return potentialProfit; }
        public int getTotalProducts() { return totalProducts; }
        public int getTotalUnitsInStock() { return totalUnitsInStock; }
        public int getLowStockCount() { return lowStockCount; }
        public int getOutOfStockCount() { return outOfStockCount; }
        public int getHealthyStockCount() { return healthyStockCount; }
    }
}
