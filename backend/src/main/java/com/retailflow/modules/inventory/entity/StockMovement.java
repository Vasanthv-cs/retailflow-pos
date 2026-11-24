package com.retailflow.modules.inventory.entity;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "stock_movements")
public class StockMovement {

    @Id
    @Column(length = 36)
    private String id;

    @Column(name = "product_id", nullable = false, length = 36)
    private String productId;

    @Column(name = "store_id", nullable = false, length = 36)
    private String storeId = "store-1";

    @Column(name = "movement_type", nullable = false, length = 30)
    private String movementType; // SALE, PURCHASE, ADJUSTMENT, TRANSFER, RETURN

    @Column(name = "quantity_change", nullable = false)
    private Integer quantityChange;

    @Column(name = "previous_stock", nullable = false)
    private Integer previousStock;

    @Column(name = "new_stock", nullable = false)
    private Integer newStock;

    @Column(length = 100)
    private String reference;

    @Column(name = "performed_by", nullable = false, length = 100)
    private String performedBy;

    @Column(length = 100)
    private String location;

    @Column(columnDefinition = "TEXT")
    private String note;

    @Column(name = "created_at", updatable = false)
    private Instant createdAt = Instant.now();

    public StockMovement() {}

    public StockMovement(String id, String productId, String movementType, Integer quantityChange,
                         Integer previousStock, Integer newStock, String reference,
                         String performedBy, String location, String note) {
        this.id = id;
        this.productId = productId;
        this.movementType = movementType;
        this.quantityChange = quantityChange;
        this.previousStock = previousStock;
        this.newStock = newStock;
        this.reference = reference;
        this.performedBy = performedBy;
        this.location = location;
        this.note = note;
        this.createdAt = Instant.now();
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getProductId() { return productId; }
    public void setProductId(String productId) { this.productId = productId; }
    public String getMovementType() { return movementType; }
    public void setMovementType(String movementType) { this.movementType = movementType; }
    public Integer getQuantityChange() { return quantityChange; }
    public void setQuantityChange(Integer quantityChange) { this.quantityChange = quantityChange; }
    public Integer getQuantityDelta() { return quantityChange; }
    public void setQuantityDelta(Integer quantityDelta) { this.quantityChange = quantityDelta; }
    public Integer getPreviousStock() { return previousStock; }
    public void setPreviousStock(Integer previousStock) { this.previousStock = previousStock; }
    public Integer getNewStock() { return newStock; }
    public void setNewStock(Integer newStock) { this.newStock = newStock; }
    public String getReference() { return reference; }
    public void setReference(String reference) { this.reference = reference; }
    public String getPerformedBy() { return performedBy; }
    public void setPerformedBy(String performedBy) { this.performedBy = performedBy; }
    public String getLocation() { return location; }
    public void setLocation(String location) { this.location = location; }
    public String getNote() { return note; }
    public void setNote(String note) { this.note = note; }
    public Instant getCreatedAt() { return createdAt; }
}
