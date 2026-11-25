package com.retailflow.modules.store.controller;

import com.retailflow.common.api.ApiResponse;
import com.retailflow.common.security.SecurityUtils;
import com.retailflow.modules.store.entity.Store;
import com.retailflow.modules.store.service.StoreService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/store")
public class StoreController {

    private final StoreService storeService;

    public StoreController(StoreService storeService) {
        this.storeService = storeService;
    }

    @GetMapping("/settings")
    public ApiResponse<Store> getSettings() {
        String storeId = SecurityUtils.resolveStoreId(null);
        return ApiResponse.ok(storeService.getStoreSettings(storeId));
    }

    @PutMapping("/settings")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ApiResponse<Store> updateSettings(@RequestBody Store store) {
        String storeId = SecurityUtils.resolveStoreId(null);
        return ApiResponse.ok(storeService.updateStoreSettings(storeId, store), "Store settings updated successfully");
    }
}
