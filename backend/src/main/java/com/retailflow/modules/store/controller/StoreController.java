package com.retailflow.modules.store.controller;

import com.retailflow.common.api.ApiResponse;
import com.retailflow.modules.store.entity.Store;
import com.retailflow.modules.store.service.StoreService;
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
        return ApiResponse.ok(storeService.getStoreSettings("store-1"));
    }

    @PutMapping("/settings")
    public ApiResponse<Store> updateSettings(@RequestBody Store store) {
        return ApiResponse.ok(storeService.updateStoreSettings("store-1", store), "Store settings updated successfully");
    }
}
