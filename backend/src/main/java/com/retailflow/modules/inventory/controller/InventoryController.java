package com.retailflow.modules.inventory.controller;

import com.retailflow.common.api.ApiResponse;
import com.retailflow.modules.catalog.entity.Product;
import com.retailflow.modules.inventory.dto.InventoryDtos;
import com.retailflow.modules.inventory.entity.StockMovement;
import com.retailflow.modules.inventory.service.InventoryService;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/inventory")
public class InventoryController {

    private final InventoryService inventoryService;

    public InventoryController(InventoryService inventoryService) {
        this.inventoryService = inventoryService;
    }

    @GetMapping
    public ApiResponse<List<InventoryDtos.InventoryRecord>> getInventory(
            @RequestParam(required = false) String storeId) {
        return ApiResponse.ok(inventoryService.getInventoryRecords(storeId));
    }

    @GetMapping("/valuation")
    public ApiResponse<InventoryDtos.InventoryValuationSummary> getInventoryValuation(
            @RequestParam(required = false) String storeId) {
        return ApiResponse.ok(inventoryService.getValuationSummary(storeId));
    }

    @PostMapping("/adjust")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'INVENTORY_STAFF')")
    public ApiResponse<Product> adjustStock(@Valid @RequestBody InventoryDtos.StockAdjustmentRequest request) {
        return ApiResponse.ok(inventoryService.adjustStock(request), "Stock adjusted successfully");
    }

    @PostMapping("/transfer")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'INVENTORY_STAFF')")
    public ApiResponse<Product> transferStock(@Valid @RequestBody InventoryDtos.StockTransferRequest request) {
        return ApiResponse.ok(inventoryService.transferStock(request), "Stock transferred successfully");
    }

    @GetMapping("/movements")
    public ApiResponse<List<StockMovement>> getMovements(@RequestParam(required = false) String productId) {
        return ApiResponse.ok(inventoryService.getStockMovements(productId));
    }
}
