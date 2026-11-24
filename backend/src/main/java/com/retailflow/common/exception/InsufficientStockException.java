package com.retailflow.common.exception;

import org.springframework.http.HttpStatus;

public class InsufficientStockException extends BusinessException {

    public InsufficientStockException(String productName, String sku, int requested, int available) {
        super("INSUFFICIENT_STOCK",
                String.format("Cannot bill %d units of '%s' (SKU: %s). Only %d units available in stock.",
                        requested, productName, sku, available),
                HttpStatus.CONFLICT);
    }
}
