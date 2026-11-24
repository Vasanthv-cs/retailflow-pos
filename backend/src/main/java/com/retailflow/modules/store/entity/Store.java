package com.retailflow.modules.store.entity;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "stores")
public class Store {

    @Id
    @Column(length = 36)
    private String id;

    @Column(nullable = false, length = 150)
    private String name;

    @Column(name = "legal_name", nullable = false, length = 200)
    private String legalName;

    @Column(nullable = false, length = 15)
    private String gstin;

    @Column(nullable = false, length = 20)
    private String phone;

    @Column(nullable = false, length = 100)
    private String email;

    @Column(nullable = false, length = 255)
    private String address;

    @Column(nullable = false, length = 80)
    private String city;

    @Column(nullable = false, length = 80)
    private String state;

    @Column(nullable = false, length = 10)
    private String pincode;

    @Column(name = "currency_symbol", length = 5)
    private String currencySymbol = "₹";

    @Column(name = "receipt_footer", columnDefinition = "TEXT")
    private String receiptFooter;

    @Column(name = "default_low_stock_threshold")
    private Integer defaultLowStockThreshold = 10;

    @Column(name = "tax_inclusive_pricing")
    private Boolean taxInclusivePricing = false;

    @Column(name = "created_at", updatable = false)
    private Instant createdAt = Instant.now();

    public Store() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getLegalName() { return legalName; }
    public void setLegalName(String legalName) { this.legalName = legalName; }
    public String getGstin() { return gstin; }
    public void setGstin(String gstin) { this.gstin = gstin; }
    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }
    public String getCity() { return city; }
    public void setCity(String city) { this.city = city; }
    public String getState() { return state; }
    public void setState(String state) { this.state = state; }
    public String getPincode() { return pincode; }
    public void setPincode(String pincode) { this.pincode = pincode; }
    public String getCurrencySymbol() { return currencySymbol; }
    public void setCurrencySymbol(String currencySymbol) { this.currencySymbol = currencySymbol; }
    public String getReceiptFooter() { return receiptFooter; }
    public void setReceiptFooter(String receiptFooter) { this.receiptFooter = receiptFooter; }
    public Integer getDefaultLowStockThreshold() { return defaultLowStockThreshold; }
    public void setDefaultLowStockThreshold(Integer defaultLowStockThreshold) { this.defaultLowStockThreshold = defaultLowStockThreshold; }
    public Boolean getTaxInclusivePricing() { return taxInclusivePricing; }
    public void setTaxInclusivePricing(Boolean taxInclusivePricing) { this.taxInclusivePricing = taxInclusivePricing; }
}
