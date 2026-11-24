package com.retailflow.modules.catalog.dto;

import com.retailflow.modules.catalog.entity.Product;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.Instant;

public class ProductDtos {

    public static class CreateProductRequest {
        @NotBlank(message = "Product name is required")
        private String name;

        private String brand;

        @NotBlank(message = "SKU is required")
        private String sku;

        private String barcode;

        @NotBlank(message = "Category ID is required")
        private String categoryId;

        private String supplierId = "sup-1";

        private String storeId = "store-1";

        @NotBlank(message = "HSN code is required")
        private String hsnCode = "100630";

        private String unit = "Piece";

        @NotNull(message = "Purchase price (cost) is required")
        @DecimalMin(value = "0.0", inclusive = true, message = "Purchase price must be non-negative")
        private BigDecimal purchasePrice;

        @NotNull(message = "Selling price is required")
        @DecimalMin(value = "0.0", inclusive = true, message = "Selling price must be non-negative")
        private BigDecimal sellingPrice;

        @NotNull(message = "GST rate is required")
        @DecimalMin(value = "0.0", inclusive = true, message = "GST rate must be non-negative")
        private BigDecimal gstRate;

        private Integer stockOnHand = 0;

        private Integer lowStockThreshold = 10;

        private String location = "Main Store Floor";

        private String status = "Active";

        private String description;

        private String imageUrl;

        public CreateProductRequest() {}

        public String getName() { return name; }
        public void setName(String name) { this.name = name; }
        public String getBrand() { return brand; }
        public void setBrand(String brand) { this.brand = brand; }
        public String getSku() { return sku; }
        public void setSku(String sku) { this.sku = sku; }
        public String getBarcode() { return barcode; }
        public void setBarcode(String barcode) { this.barcode = barcode; }
        public String getCategoryId() { return categoryId; }
        public void setCategoryId(String categoryId) { this.categoryId = categoryId; }
        public String getSupplierId() { return supplierId; }
        public void setSupplierId(String supplierId) { this.supplierId = supplierId; }
        public String getStoreId() { return storeId; }
        public void setStoreId(String storeId) { this.storeId = storeId; }
        public String getHsnCode() { return hsnCode; }
        public void setHsnCode(String hsnCode) { this.hsnCode = hsnCode; }
        public String getUnit() { return unit; }
        public void setUnit(String unit) { this.unit = unit; }
        public BigDecimal getPurchasePrice() { return purchasePrice; }
        public void setPurchasePrice(BigDecimal purchasePrice) { this.purchasePrice = purchasePrice; }
        public BigDecimal getSellingPrice() { return sellingPrice; }
        public void setSellingPrice(BigDecimal sellingPrice) { this.sellingPrice = sellingPrice; }
        public BigDecimal getGstRate() { return gstRate; }
        public void setGstRate(BigDecimal gstRate) { this.gstRate = gstRate; }
        public Integer getStockOnHand() { return stockOnHand; }
        public void setStockOnHand(Integer stockOnHand) { this.stockOnHand = stockOnHand; }
        public Integer getLowStockThreshold() { return lowStockThreshold; }
        public void setLowStockThreshold(Integer lowStockThreshold) { this.lowStockThreshold = lowStockThreshold; }
        public String getLocation() { return location; }
        public void setLocation(String location) { this.location = location; }
        public String getStatus() { return status; }
        public void setStatus(String status) { this.status = status; }
        public String getDescription() { return description; }
        public void setDescription(String description) { this.description = description; }
        public String getImageUrl() { return imageUrl; }
        public void setImageUrl(String imageUrl) { this.imageUrl = imageUrl; }
    }

    public static class UpdateProductRequest {
        @NotBlank(message = "Product name is required")
        private String name;

        private String brand;

        @NotBlank(message = "SKU is required")
        private String sku;

        private String barcode;

        @NotBlank(message = "Category ID is required")
        private String categoryId;

        private String supplierId;

        private String storeId;

        @NotBlank(message = "HSN code is required")
        private String hsnCode;

        private String unit;

        @NotNull(message = "Purchase price (cost) is required")
        @DecimalMin(value = "0.0", inclusive = true, message = "Purchase price must be non-negative")
        private BigDecimal purchasePrice;

        @NotNull(message = "Selling price is required")
        @DecimalMin(value = "0.0", inclusive = true, message = "Selling price must be non-negative")
        private BigDecimal sellingPrice;

        @NotNull(message = "GST rate is required")
        @DecimalMin(value = "0.0", inclusive = true, message = "GST rate must be non-negative")
        private BigDecimal gstRate;

        private Integer lowStockThreshold;

        private String location;

        private String status;

        private String description;

        private String imageUrl;

        public UpdateProductRequest() {}

        public String getName() { return name; }
        public void setName(String name) { this.name = name; }
        public String getBrand() { return brand; }
        public void setBrand(String brand) { this.brand = brand; }
        public String getSku() { return sku; }
        public void setSku(String sku) { this.sku = sku; }
        public String getBarcode() { return barcode; }
        public void setBarcode(String barcode) { this.barcode = barcode; }
        public String getCategoryId() { return categoryId; }
        public void setCategoryId(String categoryId) { this.categoryId = categoryId; }
        public String getSupplierId() { return supplierId; }
        public void setSupplierId(String supplierId) { this.supplierId = supplierId; }
        public String getStoreId() { return storeId; }
        public void setStoreId(String storeId) { this.storeId = storeId; }
        public String getHsnCode() { return hsnCode; }
        public void setHsnCode(String hsnCode) { this.hsnCode = hsnCode; }
        public String getUnit() { return unit; }
        public void setUnit(String unit) { this.unit = unit; }
        public BigDecimal getPurchasePrice() { return purchasePrice; }
        public void setPurchasePrice(BigDecimal purchasePrice) { this.purchasePrice = purchasePrice; }
        public BigDecimal getSellingPrice() { return sellingPrice; }
        public void setSellingPrice(BigDecimal sellingPrice) { this.sellingPrice = sellingPrice; }
        public BigDecimal getGstRate() { return gstRate; }
        public void setGstRate(BigDecimal gstRate) { this.gstRate = gstRate; }
        public Integer getLowStockThreshold() { return lowStockThreshold; }
        public void setLowStockThreshold(Integer lowStockThreshold) { this.lowStockThreshold = lowStockThreshold; }
        public String getLocation() { return location; }
        public void setLocation(String location) { this.location = location; }
        public String getStatus() { return status; }
        public void setStatus(String status) { this.status = status; }
        public String getDescription() { return description; }
        public void setDescription(String description) { this.description = description; }
        public String getImageUrl() { return imageUrl; }
        public void setImageUrl(String imageUrl) { this.imageUrl = imageUrl; }
    }

    public static class ProductResponseDto {
        private String id;
        private String storeId;
        private String categoryId;
        private String categoryName;
        private String supplierId;
        private String name;
        private String brand;
        private String sku;
        private String barcode;
        private String hsnCode;
        private String unit;
        private BigDecimal purchasePrice;
        private BigDecimal sellingPrice;
        private BigDecimal gstRate;
        private Integer stockOnHand;
        private Integer lowStockThreshold;
        private String location;
        private String status;
        private String description;
        private String imageUrl;
        private Instant createdAt;
        private boolean lowStock;

        public static ProductResponseDto fromEntity(Product p, String categoryName) {
            ProductResponseDto dto = new ProductResponseDto();
            dto.id = p.getId();
            dto.storeId = p.getStoreId();
            dto.categoryId = p.getCategoryId();
            dto.categoryName = categoryName;
            dto.supplierId = p.getSupplierId();
            dto.name = p.getName();
            dto.brand = p.getBrand();
            dto.sku = p.getSku();
            dto.barcode = p.getBarcode();
            dto.hsnCode = p.getHsnCode();
            dto.unit = p.getUnit();
            dto.purchasePrice = p.getPurchasePrice();
            dto.sellingPrice = p.getSellingPrice();
            dto.gstRate = p.getGstRate();
            dto.stockOnHand = p.getStockOnHand() != null ? p.getStockOnHand() : 0;
            dto.lowStockThreshold = p.getLowStockThreshold() != null ? p.getLowStockThreshold() : 10;
            dto.location = p.getLocation();
            dto.status = p.getStatus() != null ? p.getStatus() : "Active";
            dto.description = p.getDescription();
            dto.imageUrl = p.getImageUrl();
            dto.createdAt = p.getCreatedAt();
            dto.lowStock = dto.stockOnHand <= dto.lowStockThreshold;
            return dto;
        }

        public String getId() { return id; }
        public String getStoreId() { return storeId; }
        public String getCategoryId() { return categoryId; }
        public String getCategoryName() { return categoryName; }
        public String getSupplierId() { return supplierId; }
        public String getName() { return name; }
        public String getBrand() { return brand; }
        public String getSku() { return sku; }
        public String getBarcode() { return barcode; }
        public String getHsnCode() { return hsnCode; }
        public String getUnit() { return unit; }
        public BigDecimal getPurchasePrice() { return purchasePrice; }
        public BigDecimal getSellingPrice() { return sellingPrice; }
        public BigDecimal getGstRate() { return gstRate; }
        public Integer getStockOnHand() { return stockOnHand; }
        public Integer getLowStockThreshold() { return lowStockThreshold; }
        public String getLocation() { return location; }
        public String getStatus() { return status; }
        public String getDescription() { return description; }
        public String getImageUrl() { return imageUrl; }
        public Instant getCreatedAt() { return createdAt; }
        public boolean isLowStock() { return lowStock; }
    }

    public static class InventoryValuationSummaryDto {
        private BigDecimal totalCostValuation;
        private BigDecimal totalRetailValuation;
        private BigDecimal potentialProfit;
        private int totalProducts;
        private int totalUnitsInStock;
        private int lowStockCount;
        private int outOfStockCount;

        public InventoryValuationSummaryDto() {}

        public InventoryValuationSummaryDto(BigDecimal totalCostValuation, BigDecimal totalRetailValuation,
                                           BigDecimal potentialProfit, int totalProducts, int totalUnitsInStock,
                                           int lowStockCount, int outOfStockCount) {
            this.totalCostValuation = totalCostValuation;
            this.totalRetailValuation = totalRetailValuation;
            this.potentialProfit = potentialProfit;
            this.totalProducts = totalProducts;
            this.totalUnitsInStock = totalUnitsInStock;
            this.lowStockCount = lowStockCount;
            this.outOfStockCount = outOfStockCount;
        }

        public BigDecimal getTotalCostValuation() { return totalCostValuation; }
        public BigDecimal getTotalRetailValuation() { return totalRetailValuation; }
        public BigDecimal getPotentialProfit() { return potentialProfit; }
        public int getTotalProducts() { return totalProducts; }
        public int getTotalUnitsInStock() { return totalUnitsInStock; }
        public int getLowStockCount() { return lowStockCount; }
        public int getOutOfStockCount() { return outOfStockCount; }
    }
}
