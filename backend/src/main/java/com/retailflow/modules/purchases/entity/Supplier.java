package com.retailflow.modules.purchases.entity;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "suppliers")
public class Supplier {

    @Id
    @Column(length = 36)
    private String id;

    @Column(nullable = false, length = 150)
    private String name;

    @Column(name = "contact_person", nullable = false, length = 100)
    private String contactPerson;

    @Column(nullable = false, length = 20)
    private String phone;

    @Column(length = 100)
    private String email;

    @Column(nullable = false, length = 15)
    private String gstin;

    @Column(nullable = false, length = 80)
    private String city;

    @Column(nullable = false, length = 255)
    private String address;

    @Column(name = "payment_terms", length = 50)
    private String paymentTerms = "Net 15 Days";

    @Column(name = "created_at", updatable = false)
    private Instant createdAt = Instant.now();

    public Supplier() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getContactPerson() { return contactPerson; }
    public void setContactPerson(String contactPerson) { this.contactPerson = contactPerson; }
    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getGstin() { return gstin; }
    public void setGstin(String gstin) { this.gstin = gstin; }
    public String getCity() { return city; }
    public void setCity(String city) { this.city = city; }
    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }
    public String getPaymentTerms() { return paymentTerms; }
    public void setPaymentTerms(String paymentTerms) { this.paymentTerms = paymentTerms; }
    public Instant getCreatedAt() { return createdAt; }
}
