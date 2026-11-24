package com.retailflow.modules.auth.entity;

public enum UserStatus {
    ACTIVE,
    INACTIVE,
    SUSPENDED;

    public static UserStatus fromString(String value) {
        if (value == null) return ACTIVE;
        try {
            return UserStatus.valueOf(value.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            return ACTIVE;
        }
    }
}
