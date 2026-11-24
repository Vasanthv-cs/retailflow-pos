package com.retailflow.modules.inventory.service;

import com.retailflow.common.exception.BusinessException;
import com.retailflow.modules.catalog.entity.Product;
import com.retailflow.modules.catalog.repository.ProductRepository;
import com.retailflow.modules.inventory.dto.InventoryDtos;
import com.retailflow.modules.inventory.entity.StockMovement;
import com.retailflow.modules.inventory.repository.StockMovementRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class InventoryServiceTest {

    @Mock
    private ProductRepository productRepository;

    @Mock
    private StockMovementRepository stockMovementRepository;

    @InjectMocks
    private InventoryService inventoryService;

    private Product product1;
    private Product product2;

    @BeforeEach
    void setUp() {
        product1 = new Product();
        product1.setId("prod-1");
        product1.setSku("RICE-1");
        product1.setName("Basmati Rice 5kg");
        product1.setStockOnHand(20);
        product1.setLowStockThreshold(10);
        product1.setPurchasePrice(new BigDecimal("400.00"));
        product1.setSellingPrice(new BigDecimal("500.00"));
        product1.setLocation("Aisle 1");

        product2 = new Product();
        product2.setId("prod-2");
        product2.setSku("OIL-1");
        product2.setName("Sunflower Oil 1L");
        product2.setStockOnHand(5); // Low stock
        product2.setLowStockThreshold(10);
        product2.setPurchasePrice(new BigDecimal("120.00"));
        product2.setSellingPrice(new BigDecimal("150.00"));
        product2.setLocation("Aisle 2");
    }

    @Test
    @DisplayName("Should accurately calculate inventory valuation summary with BigDecimal precision")
    void testInventoryValuationSummary() {
        when(productRepository.findAll()).thenReturn(List.of(product1, product2));

        InventoryDtos.InventoryValuationSummary summary = inventoryService.getValuationSummary(null);

        assertNotNull(summary);
        assertEquals(2, summary.getTotalProducts());
        assertEquals(25, summary.getTotalUnitsInStock()); // 20 + 5
        // Cost: (20 * 400) + (5 * 120) = 8000 + 600 = 8600.00
        assertEquals(new BigDecimal("8600.00"), summary.getTotalCostValuation());
        // Retail: (20 * 500) + (5 * 150) = 10000 + 750 = 10750.00
        assertEquals(new BigDecimal("10750.00"), summary.getTotalRetailValuation());
        // Profit: 10750 - 8600 = 2150.00
        assertEquals(new BigDecimal("2150.00"), summary.getPotentialProfit());
        assertEquals(1, summary.getHealthyStockCount());
        assertEquals(1, summary.getLowStockCount());
        assertEquals(0, summary.getOutOfStockCount());
    }

    @Test
    @DisplayName("Should adjust stock and record immutable StockMovement ledger entry")
    void testStockAdjustmentPositive() {
        when(productRepository.findById("prod-1")).thenReturn(Optional.of(product1));
        when(productRepository.save(any(Product.class))).thenAnswer(invocation -> invocation.getArgument(0));

        InventoryDtos.StockAdjustmentRequest req = new InventoryDtos.StockAdjustmentRequest();
        req.setProductId("prod-1");
        req.setDelta(10);
        req.setReason("Cycle count correction");
        req.setPerformedBy("Manager John");

        Product updated = inventoryService.adjustStock(req);

        assertEquals(30, updated.getStockOnHand());

        ArgumentCaptor<StockMovement> captor = ArgumentCaptor.forClass(StockMovement.class);
        verify(stockMovementRepository, times(1)).save(captor.capture());

        StockMovement movement = captor.getValue();
        assertEquals("prod-1", movement.getProductId());
        assertEquals(10, movement.getQuantityDelta());
        assertEquals(20, movement.getPreviousStock());
        assertEquals(30, movement.getNewStock());
        assertEquals("Adjustment", movement.getMovementType());
        assertEquals("Manager John", movement.getPerformedBy());
        assertEquals("Cycle count correction", movement.getNotes());
    }

    @Test
    @DisplayName("Should reject negative stock adjustment when delta exceeds stockOnHand")
    void testStockAdjustmentRejectsNegativeResult() {
        when(productRepository.findById("prod-1")).thenReturn(Optional.of(product1));

        InventoryDtos.StockAdjustmentRequest req = new InventoryDtos.StockAdjustmentRequest();
        req.setProductId("prod-1");
        req.setDelta(-25); // Current is 20, would result in -5
        req.setReason("Damaged stock");

        BusinessException exception = assertThrows(BusinessException.class, () ->
                inventoryService.adjustStock(req)
        );

        assertEquals("INSUFFICIENT_STOCK", exception.getErrorCode());
        verify(productRepository, never()).save(any(Product.class));
        verify(stockMovementRepository, never()).save(any(StockMovement.class));
    }
}
