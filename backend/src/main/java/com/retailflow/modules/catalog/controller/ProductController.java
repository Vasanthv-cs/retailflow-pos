package com.retailflow.modules.catalog.controller;

import com.retailflow.common.api.ApiResponse;
import com.retailflow.common.api.PageResponse;
import com.retailflow.modules.catalog.dto.ProductDtos;
import com.retailflow.modules.catalog.service.CatalogService;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/products")
public class ProductController {

    private final CatalogService catalogService;

    public ProductController(CatalogService catalogService) {
        this.catalogService = catalogService;
    }

    @GetMapping
    public ApiResponse<List<ProductDtos.ProductResponseDto>> getProducts(
            @RequestParam(required = false) String query,
            @RequestParam(required = false) String categoryId,
            @RequestParam(required = false) String storeId) {
        return ApiResponse.ok(catalogService.getAllProducts(query, categoryId, storeId));
    }

    @GetMapping("/paginated")
    public ApiResponse<PageResponse<ProductDtos.ProductResponseDto>> getPaginatedProducts(
            @RequestParam(required = false) String query,
            @RequestParam(required = false) String categoryId,
            @RequestParam(required = false) String storeId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "name") String sortBy,
            @RequestParam(defaultValue = "asc") String direction) {
        return ApiResponse.ok(catalogService.getPaginatedProducts(query, categoryId, storeId, page, size, sortBy, direction));
    }

    @GetMapping("/{id}")
    public ApiResponse<ProductDtos.ProductResponseDto> getProductById(@PathVariable String id) {
        return ApiResponse.ok(catalogService.getProductById(id));
    }

    @GetMapping("/by-barcode/{code}")
    public ApiResponse<ProductDtos.ProductResponseDto> getProductByBarcode(@PathVariable String code) {
        return ApiResponse.ok(catalogService.getProductByBarcodeOrSku(code));
    }

    @GetMapping("/low-stock")
    public ApiResponse<List<ProductDtos.ProductResponseDto>> getLowStockProducts(
            @RequestParam(required = false) String storeId) {
        return ApiResponse.ok(catalogService.getLowStockProducts(storeId));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'INVENTORY_STAFF')")
    public ApiResponse<ProductDtos.ProductResponseDto> createProduct(@Valid @RequestBody ProductDtos.CreateProductRequest request) {
        return ApiResponse.created(catalogService.createProduct(request), "Product created successfully");
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'INVENTORY_STAFF')")
    public ApiResponse<ProductDtos.ProductResponseDto> updateProduct(
            @PathVariable String id,
            @Valid @RequestBody ProductDtos.UpdateProductRequest request) {
        return ApiResponse.ok(catalogService.updateProduct(id, request), "Product updated successfully");
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ApiResponse<Void> deleteProduct(@PathVariable String id) {
        catalogService.deleteProduct(id);
        return ApiResponse.ok(null, "Product deleted successfully");
    }
}
