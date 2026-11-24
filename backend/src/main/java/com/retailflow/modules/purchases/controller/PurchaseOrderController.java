package com.retailflow.modules.purchases.controller;

import com.retailflow.common.api.ApiResponse;
import com.retailflow.modules.purchases.dto.PurchaseDtos;
import com.retailflow.modules.purchases.service.PurchaseService;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/purchase-orders")
public class PurchaseOrderController {

    private final PurchaseService purchaseService;

    public PurchaseOrderController(PurchaseService purchaseService) {
        this.purchaseService = purchaseService;
    }

    @GetMapping
    public ApiResponse<List<PurchaseDtos.PurchaseOrderDto>> getPurchaseOrders(
            @RequestParam(required = false) String status) {
        return ApiResponse.ok(purchaseService.getAllPurchaseOrders(status));
    }

    @GetMapping("/{id}")
    public ApiResponse<PurchaseDtos.PurchaseOrderDto> getPurchaseOrderById(@PathVariable String id) {
        return ApiResponse.ok(purchaseService.getPurchaseOrderById(id));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'INVENTORY_STAFF')")
    public ApiResponse<PurchaseDtos.PurchaseOrderDto> createPurchaseOrder(
            @Valid @RequestBody PurchaseDtos.CreatePurchaseOrderRequest poRequest) {
        return ApiResponse.created(purchaseService.createPurchaseOrder(poRequest), "Purchase order created successfully");
    }

    @PostMapping("/{id}/receive")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'INVENTORY_STAFF')")
    public ApiResponse<PurchaseDtos.PurchaseOrderDto> receiveGoods(
            @PathVariable String id,
            @RequestBody(required = false) PurchaseDtos.ReceiveGoodsRequest receiveRequest) {
        PurchaseDtos.ReceiveGoodsRequest req = receiveRequest != null ? receiveRequest : new PurchaseDtos.ReceiveGoodsRequest();
        return ApiResponse.ok(purchaseService.receiveGoods(id, req), "Goods received and inventory updated");
    }

    @PatchMapping("/{id}/cancel")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ApiResponse<PurchaseDtos.PurchaseOrderDto> cancelPurchaseOrder(@PathVariable String id) {
        return ApiResponse.ok(purchaseService.cancelPurchaseOrder(id), "Purchase order cancelled successfully");
    }
}
