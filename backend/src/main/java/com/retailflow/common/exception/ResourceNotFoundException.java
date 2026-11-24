package com.retailflow.common.exception;

import org.springframework.http.HttpStatus;

public class ResourceNotFoundException extends BusinessException {

    public ResourceNotFoundException(String resourceName, String identifier) {
        super("RESOURCE_NOT_FOUND", resourceName + " not found with identifier: " + identifier, HttpStatus.NOT_FOUND);
    }
}
