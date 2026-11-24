package com.retailflow.modules.purchases.entity;

public enum PurchaseOrderStatus {
    DRAFT,
    ORDERED,
    PARTIALLY_RECEIVED,
    RECEIVED,
    CANCELLED;

    public static PurchaseOrderStatus fromString(String value) {
        if (value == null) return ORDERED;
        String normalized = value.trim().toUpperCase().replace(" ", "_");
        for (PurchaseOrderStatus s : values()) {
            if (s.name().equals(normalized)) {
                return s;
            }
        }
        if (normalized.contains("PEND")) return ORDERED;
        if (normalized.contains("PARTIAL")) return PARTIALLY_RECEIVED;
        if (normalized.contains("REC")) return RECEIVED;
        if (normalized.contains("CANC")) return CANCELLED;
        return ORDERED;
    }
}
