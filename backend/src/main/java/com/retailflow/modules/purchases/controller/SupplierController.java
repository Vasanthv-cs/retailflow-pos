package com.retailflow.modules.purchases.controller;

import com.retailflow.common.api.ApiResponse;
import com.retailflow.modules.purchases.dto.PurchaseDtos;
import com.retailflow.modules.purchases.entity.Supplier;
import com.retailflow.modules.purchases.service.PurchaseService;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/suppliers")
public class SupplierController {

    private final PurchaseService purchaseService;

    public SupplierController(PurchaseService purchaseService) {
        this.purchaseService = purchaseService;
    }

    @GetMapping
    public ApiResponse<List<Supplier>> getSuppliers(@RequestParam(required = false) String query) {
        return ApiResponse.ok(purchaseService.getAllSuppliers(query));
    }

    @GetMapping("/{id}")
    public ApiResponse<Supplier> getSupplierById(@PathVariable String id) {
        return ApiResponse.ok(purchaseService.getSupplierById(id));
    }

    @GetMapping("/{id}/purchase-history")
    public ApiResponse<List<PurchaseDtos.PurchaseOrderDto>> getSupplierPurchaseHistory(@PathVariable String id) {
        return ApiResponse.ok(purchaseService.getPurchaseOrdersBySupplier(id));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ApiResponse<Supplier> createSupplier(@Valid @RequestBody Supplier supplier) {
        return ApiResponse.created(purchaseService.createSupplier(supplier), "Supplier added successfully");
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ApiResponse<Supplier> updateSupplier(@PathVariable String id, @Valid @RequestBody Supplier supplier) {
        return ApiResponse.ok(purchaseService.updateSupplier(id, supplier), "Supplier updated successfully");
    }
}
