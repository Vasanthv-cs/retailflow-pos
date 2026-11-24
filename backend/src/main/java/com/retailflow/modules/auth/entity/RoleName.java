package com.retailflow.modules.auth.entity;

public enum RoleName {
    ADMIN,
    MANAGER,
    CASHIER,
    INVENTORY_STAFF,
    ACCOUNTANT;

    public static RoleName fromString(String value) {
        if (value == null) return CASHIER;
        String normalized = value.trim().toUpperCase().replace(" ", "_");
        for (RoleName r : values()) {
            if (r.name().equals(normalized)) {
                return r;
            }
        }
        // Fallback for legacy display names
        if (normalized.contains("MANAGER")) return MANAGER;
        if (normalized.contains("INVENTORY") || normalized.contains("CLERK")) return INVENTORY_STAFF;
        if (normalized.contains("ACCOUNT")) return ACCOUNTANT;
        if (normalized.contains("ADMIN")) return ADMIN;
        return CASHIER;
    }
}
