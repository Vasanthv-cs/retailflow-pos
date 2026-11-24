package com.retailflow.modules.catalog.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "categories")
public class Category {

    @Id
    @Column(length = 36)
    private String id;

    @Column(nullable = false, unique = true, length = 100)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "default_gst_rate", precision = 5, scale = 2)
    private BigDecimal defaultGstRate = BigDecimal.valueOf(5.00);

    @Column(name = "created_at", updatable = false)
    private Instant createdAt = Instant.now();

    public Category() {}

    public Category(String id, String name, String description, BigDecimal defaultGstRate) {
        this.id = id;
        this.name = name;
        this.description = description;
        this.defaultGstRate = defaultGstRate;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public BigDecimal getDefaultGstRate() { return defaultGstRate; }
    public void setDefaultGstRate(BigDecimal defaultGstRate) { this.defaultGstRate = defaultGstRate; }
    public Instant getCreatedAt() { return createdAt; }
}
