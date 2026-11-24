package com.retailflow.modules.returns.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import java.math.BigDecimal;

@Entity
@Table(name = "return_items")
public class ReturnItem {

    @Id
    @Column(length = 36)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "return_id", nullable = false)
    @JsonIgnore
    private ReturnRecord returnRecord;

    @Column(name = "product_id", nullable = false, length = 36)
    private String productId;

    @Column(nullable = false)
    private Integer quantity;

    @Column(name = "unit_refund", nullable = false, precision = 12, scale = 2)
    private BigDecimal unitRefund;

    @Column(name = "refund_amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal refundAmount;

    @Column(name = "item_condition", nullable = false, length = 30)
    private String itemCondition; // Sellable, Damaged

    public ReturnItem() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public ReturnRecord getReturnRecord() { return returnRecord; }
    public void setReturnRecord(ReturnRecord returnRecord) { this.returnRecord = returnRecord; }
    public String getProductId() { return productId; }
    public void setProductId(String productId) { this.productId = productId; }
    public Integer getQuantity() { return quantity; }
    public void setQuantity(Integer quantity) { this.quantity = quantity; }
    public BigDecimal getUnitRefund() { return unitRefund; }
    public void setUnitRefund(BigDecimal unitRefund) { this.unitRefund = unitRefund; }
    public BigDecimal getRefundAmount() { return refundAmount; }
    public void setRefundAmount(BigDecimal refundAmount) { this.refundAmount = refundAmount; }
    public String getItemCondition() { return itemCondition; }
    public void setItemCondition(String itemCondition) { this.itemCondition = itemCondition; }
}
