package com.retailflow.modules.catalog.service;

import com.retailflow.common.exception.BusinessException;
import com.retailflow.modules.catalog.dto.ProductDtos;
import com.retailflow.modules.catalog.entity.Category;
import com.retailflow.modules.catalog.entity.Product;
import com.retailflow.modules.catalog.repository.CategoryRepository;
import com.retailflow.modules.catalog.repository.ProductRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CatalogServiceTest {

    @Mock
    private CategoryRepository categoryRepository;

    @Mock
    private ProductRepository productRepository;

    @InjectMocks
    private CatalogService catalogService;

    private Category testCategory;
    private ProductDtos.CreateProductRequest createRequest;

    @BeforeEach
    void setUp() {
        testCategory = new Category("cat-1", "Rice & Staples", "Grain essentials", new BigDecimal("5.00"));

        createRequest = new ProductDtos.CreateProductRequest();
        createRequest.setName("Daawat Basmati Rice 5kg");
        createRequest.setBrand("Daawat");
        createRequest.setSku("RICE-DAA-5KG");
        createRequest.setBarcode("8901234567890");
        createRequest.setCategoryId("cat-1");
        createRequest.setHsnCode("100630");
        createRequest.setUnit("Bag");
        createRequest.setPurchasePrice(new BigDecimal("420.00"));
        createRequest.setSellingPrice(new BigDecimal("550.00"));
        createRequest.setGstRate(new BigDecimal("5.00"));
        createRequest.setStockOnHand(25);
        createRequest.setLowStockThreshold(10);
    }

    @Test
    @DisplayName("Should create product successfully when SKU and barcode are unique")
    void testCreateProductSuccess() {
        when(productRepository.existsBySku("RICE-DAA-5KG")).thenReturn(false);
        when(productRepository.existsByBarcode("8901234567890")).thenReturn(false);
        when(productRepository.save(any(Product.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(categoryRepository.findById("cat-1")).thenReturn(Optional.of(testCategory));

        ProductDtos.ProductResponseDto result = catalogService.createProduct(createRequest);

        assertNotNull(result);
        assertEquals("Daawat Basmati Rice 5kg", result.getName());
        assertEquals("RICE-DAA-5KG", result.getSku());
        assertEquals("Rice & Staples", result.getCategoryName());
        assertEquals(25, result.getStockOnHand());
        assertFalse(result.isLowStock());
        verify(productRepository, times(1)).save(any(Product.class));
    }

    @Test
    @DisplayName("Should reject product creation when SKU already exists")
    void testCreateProductDuplicateSku() {
        when(productRepository.existsBySku("RICE-DAA-5KG")).thenReturn(true);

        BusinessException exception = assertThrows(BusinessException.class, () ->
                catalogService.createProduct(createRequest)
        );

        assertEquals("DUPLICATE_SKU", exception.getErrorCode());
        verify(productRepository, never()).save(any(Product.class));
    }

    @Test
    @DisplayName("Should reject product creation when Barcode already exists")
    void testCreateProductDuplicateBarcode() {
        when(productRepository.existsBySku("RICE-DAA-5KG")).thenReturn(false);
        when(productRepository.existsByBarcode("8901234567890")).thenReturn(true);

        BusinessException exception = assertThrows(BusinessException.class, () ->
                catalogService.createProduct(createRequest)
        );

        assertEquals("DUPLICATE_BARCODE", exception.getErrorCode());
        verify(productRepository, never()).save(any(Product.class));
    }

    @Test
    @DisplayName("Should reject product update when SKU is taken by another product")
    void testUpdateProductDuplicateSku() {
        Product existing = new Product();
        existing.setId("prod-1");
        existing.setSku("RICE-OLD-5KG");

        ProductDtos.UpdateProductRequest updateReq = new ProductDtos.UpdateProductRequest();
        updateReq.setName("Updated Rice");
        updateReq.setSku("RICE-TAKEN");
        updateReq.setCategoryId("cat-1");
        updateReq.setHsnCode("100630");
        updateReq.setPurchasePrice(new BigDecimal("400.00"));
        updateReq.setSellingPrice(new BigDecimal("500.00"));
        updateReq.setGstRate(new BigDecimal("5.00"));

        when(productRepository.findById("prod-1")).thenReturn(Optional.of(existing));
        when(productRepository.existsBySkuAndIdNot("RICE-TAKEN", "prod-1")).thenReturn(true);

        BusinessException exception = assertThrows(BusinessException.class, () ->
                catalogService.updateProduct("prod-1", updateReq)
        );

        assertEquals("DUPLICATE_SKU", exception.getErrorCode());
        verify(productRepository, never()).save(any(Product.class));
    }
}
