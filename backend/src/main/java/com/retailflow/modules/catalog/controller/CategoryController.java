package com.retailflow.modules.catalog.controller;

import com.retailflow.common.api.ApiResponse;
import com.retailflow.modules.catalog.entity.Category;
import com.retailflow.modules.catalog.service.CatalogService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/categories")
public class CategoryController {

    private final CatalogService catalogService;

    public CategoryController(CatalogService catalogService) {
        this.catalogService = catalogService;
    }

    @GetMapping
    public ApiResponse<List<Category>> getCategories() {
        return ApiResponse.ok(catalogService.getAllCategories());
    }

    @PostMapping
    public ApiResponse<Category> createCategory(@RequestBody Category category) {
        return ApiResponse.created(catalogService.createCategory(category), "Category created successfully");
    }

    @PutMapping("/{id}")
    public ApiResponse<Category> updateCategory(@PathVariable String id, @RequestBody Category category) {
        return ApiResponse.ok(catalogService.updateCategory(id, category), "Category updated successfully");
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> deleteCategory(@PathVariable String id) {
        catalogService.deleteCategory(id);
        return ApiResponse.ok(null, "Category deleted successfully");
    }
}
