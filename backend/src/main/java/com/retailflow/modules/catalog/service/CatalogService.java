package com.retailflow.modules.catalog.service;

import com.retailflow.common.api.PageResponse;
import com.retailflow.common.exception.BusinessException;
import com.retailflow.common.exception.ResourceNotFoundException;
import com.retailflow.modules.catalog.dto.ProductDtos;
import com.retailflow.modules.catalog.entity.Category;
import com.retailflow.modules.catalog.entity.Product;
import com.retailflow.modules.catalog.repository.CategoryRepository;
import com.retailflow.modules.catalog.repository.ProductRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class CatalogService {

    private final CategoryRepository categoryRepository;
    private final ProductRepository productRepository;

    public CatalogService(CategoryRepository categoryRepository, ProductRepository productRepository) {
        this.categoryRepository = categoryRepository;
        this.productRepository = productRepository;
    }

    // ==========================================
    // Category Management
    // ==========================================

    @Transactional(readOnly = true)
    public List<Category> getAllCategories() {
        return categoryRepository.findAll();
    }

    @Transactional
    public Category createCategory(Category category) {
        if (categoryRepository.existsByName(category.getName())) {
            throw new BusinessException("DUPLICATE_CATEGORY", "Category name already exists: " + category.getName());
        }
        if (category.getId() == null || category.getId().isBlank()) {
            category.setId("cat-" + UUID.randomUUID().toString().substring(0, 8));
        }
        return categoryRepository.save(category);
    }

    @Transactional
    public Category updateCategory(String id, Category updates) {
        Category category = categoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Category", id));
        category.setName(updates.getName());
        category.setDescription(updates.getDescription());
        category.setDefaultGstRate(updates.getDefaultGstRate());
        return categoryRepository.save(category);
    }

    @Transactional
    public void deleteCategory(String id) {
        List<Product> linked = productRepository.findByCategoryId(id);
        if (!linked.isEmpty()) {
            throw new BusinessException("CATEGORY_IN_USE", "Cannot delete category with " + linked.size() + " active products");
        }
        categoryRepository.deleteById(id);
    }

    // ==========================================
    // Product Management & Queries
    // ==========================================

    @Transactional(readOnly = true)
    public List<ProductDtos.ProductResponseDto> getAllProducts(String query, String categoryId, String storeId) {
        List<Product> products;
        if (query != null && !query.isBlank()) {
            products = productRepository.searchProducts(query.trim());
        } else if (categoryId != null && !categoryId.isBlank() && !"all".equalsIgnoreCase(categoryId)) {
            products = productRepository.findByCategoryId(categoryId);
        } else if (storeId != null && !storeId.isBlank()) {
            products = productRepository.findByStoreId(storeId);
        } else {
            products = productRepository.findAll();
        }

        Map<String, String> categoryNames = getCategoryNameMap();
        return products.stream()
                .map(p -> ProductDtos.ProductResponseDto.fromEntity(p, categoryNames.getOrDefault(p.getCategoryId(), "General")))
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public PageResponse<ProductDtos.ProductResponseDto> getPaginatedProducts(
            String query, String categoryId, String storeId, int page, int size, String sortBy, String direction) {

        Sort sort = "desc".equalsIgnoreCase(direction) ? Sort.by(sortBy).descending() : Sort.by(sortBy).ascending();
        Pageable pageable = PageRequest.of(page, size, sort);

        Page<Product> paged = productRepository.searchAndFilter(
                (query != null && !query.isBlank()) ? query.trim() : null,
                categoryId,
                storeId,
                pageable
        );

        Map<String, String> categoryNames = getCategoryNameMap();
        List<ProductDtos.ProductResponseDto> dtos = paged.getContent().stream()
                .map(p -> ProductDtos.ProductResponseDto.fromEntity(p, categoryNames.getOrDefault(p.getCategoryId(), "General")))
                .collect(Collectors.toList());

        return PageResponse.of(dtos, paged.getNumber(), paged.getSize(), paged.getTotalElements());
    }

    @Transactional(readOnly = true)
    public ProductDtos.ProductResponseDto getProductById(String id) {
        Product product = findProductEntity(id);
        String categoryName = categoryRepository.findById(product.getCategoryId())
                .map(Category::getName)
                .orElse("General");
        return ProductDtos.ProductResponseDto.fromEntity(product, categoryName);
    }

    @Transactional(readOnly = true)
    public Product findProductEntity(String id) {
        return productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Product", id));
    }

    @Transactional(readOnly = true)
    public ProductDtos.ProductResponseDto getProductByBarcodeOrSku(String code) {
        Product product = productRepository.findByBarcode(code)
                .or(() -> productRepository.findBySku(code))
                .orElseThrow(() -> new ResourceNotFoundException("Product", code));

        String categoryName = categoryRepository.findById(product.getCategoryId())
                .map(Category::getName)
                .orElse("General");
        return ProductDtos.ProductResponseDto.fromEntity(product, categoryName);
    }

    @Transactional
    public ProductDtos.ProductResponseDto createProduct(ProductDtos.CreateProductRequest req) {
        // Duplicate SKU validation
        if (productRepository.existsBySku(req.getSku().trim())) {
            throw new BusinessException("DUPLICATE_SKU", "A product with SKU '" + req.getSku() + "' already exists.");
        }

        // Duplicate Barcode validation (if barcode is supplied)
        if (req.getBarcode() != null && !req.getBarcode().isBlank()) {
            if (productRepository.existsByBarcode(req.getBarcode().trim())) {
                throw new BusinessException("DUPLICATE_BARCODE", "A product with Barcode '" + req.getBarcode() + "' already exists.");
            }
        }

        Product product = new Product();
        product.setId("prod-" + UUID.randomUUID().toString().substring(0, 8));
        product.setStoreId(req.getStoreId() != null && !req.getStoreId().isBlank() ? req.getStoreId() : "store-1");
        product.setCategoryId(req.getCategoryId());
        product.setSupplierId(req.getSupplierId() != null ? req.getSupplierId() : "sup-1");
        product.setName(req.getName().trim());
        product.setBrand(req.getBrand());
        product.setSku(req.getSku().trim().toUpperCase());
        product.setBarcode(req.getBarcode() != null && !req.getBarcode().isBlank() ? req.getBarcode().trim() : null);
        product.setHsnCode(req.getHsnCode() != null ? req.getHsnCode().trim() : "100630");
        product.setUnit(req.getUnit() != null ? req.getUnit() : "Piece");
        product.setPurchasePrice(req.getPurchasePrice());
        product.setSellingPrice(req.getSellingPrice());
        product.setGstRate(req.getGstRate());
        product.setStockOnHand(req.getStockOnHand() != null ? req.getStockOnHand() : 0);
        product.setLowStockThreshold(req.getLowStockThreshold() != null ? req.getLowStockThreshold() : 10);
        product.setLocation(req.getLocation() != null ? req.getLocation() : "Main Store Floor");
        product.setStatus(req.getStatus() != null ? req.getStatus() : "Active");
        product.setDescription(req.getDescription());
        product.setImageUrl(req.getImageUrl());

        Product saved = productRepository.save(product);
        String catName = categoryRepository.findById(saved.getCategoryId()).map(Category::getName).orElse("General");
        return ProductDtos.ProductResponseDto.fromEntity(saved, catName);
    }

    @Transactional
    public ProductDtos.ProductResponseDto updateProduct(String id, ProductDtos.UpdateProductRequest req) {
        Product product = findProductEntity(id);

        // Duplicate SKU validation (excluding current product)
        if (productRepository.existsBySkuAndIdNot(req.getSku().trim(), id)) {
            throw new BusinessException("DUPLICATE_SKU", "Another product already uses SKU '" + req.getSku() + "'.");
        }

        // Duplicate Barcode validation (excluding current product)
        if (req.getBarcode() != null && !req.getBarcode().isBlank()) {
            if (productRepository.existsByBarcodeAndIdNot(req.getBarcode().trim(), id)) {
                throw new BusinessException("DUPLICATE_BARCODE", "Another product already uses Barcode '" + req.getBarcode() + "'.");
            }
        }

        product.setName(req.getName().trim());
        product.setBrand(req.getBrand());
        product.setCategoryId(req.getCategoryId());
        if (req.getSupplierId() != null) {
            product.setSupplierId(req.getSupplierId());
        }
        if (req.getStoreId() != null) {
            product.setStoreId(req.getStoreId());
        }
        product.setSku(req.getSku().trim().toUpperCase());
        product.setBarcode(req.getBarcode() != null && !req.getBarcode().isBlank() ? req.getBarcode().trim() : null);
        product.setHsnCode(req.getHsnCode());
        if (req.getUnit() != null) {
            product.setUnit(req.getUnit());
        }
        product.setPurchasePrice(req.getPurchasePrice());
        product.setSellingPrice(req.getSellingPrice());
        product.setGstRate(req.getGstRate());
        if (req.getLowStockThreshold() != null) {
            product.setLowStockThreshold(req.getLowStockThreshold());
        }
        if (req.getLocation() != null) {
            product.setLocation(req.getLocation());
        }
        if (req.getStatus() != null) {
            product.setStatus(req.getStatus());
        }
        product.setDescription(req.getDescription());
        if (req.getImageUrl() != null) {
            product.setImageUrl(req.getImageUrl());
        }

        Product saved = productRepository.save(product);
        String catName = categoryRepository.findById(saved.getCategoryId()).map(Category::getName).orElse("General");
        return ProductDtos.ProductResponseDto.fromEntity(saved, catName);
    }

    @Transactional
    public void deleteProduct(String id) {
        if (!productRepository.existsById(id)) {
            throw new ResourceNotFoundException("Product", id);
        }
        productRepository.deleteById(id);
    }

    @Transactional(readOnly = true)
    public List<ProductDtos.ProductResponseDto> getLowStockProducts(String storeId) {
        List<Product> lowStock;
        if (storeId != null && !storeId.isBlank()) {
            lowStock = productRepository.findLowStockProductsByStore(storeId);
        } else {
            lowStock = productRepository.findLowStockProducts();
        }

        Map<String, String> categoryNames = getCategoryNameMap();
        return lowStock.stream()
                .map(p -> ProductDtos.ProductResponseDto.fromEntity(p, categoryNames.getOrDefault(p.getCategoryId(), "General")))
                .collect(Collectors.toList());
    }

    private Map<String, String> getCategoryNameMap() {
        return categoryRepository.findAll().stream()
                .collect(Collectors.toMap(Category::getId, Category::getName, (a, b) -> a));
    }
}
