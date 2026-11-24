package com.retailflow.modules.purchases.service;

import com.retailflow.common.exception.BusinessException;
import com.retailflow.modules.catalog.entity.Product;
import com.retailflow.modules.catalog.repository.ProductRepository;
import com.retailflow.modules.inventory.entity.StockMovement;
import com.retailflow.modules.inventory.repository.StockMovementRepository;
import com.retailflow.modules.purchases.dto.PurchaseDtos;
import com.retailflow.modules.purchases.entity.PurchaseOrder;
import com.retailflow.modules.purchases.entity.PurchaseOrderItem;
import com.retailflow.modules.purchases.entity.PurchaseOrderStatus;
import com.retailflow.modules.purchases.entity.Supplier;
import com.retailflow.modules.purchases.repository.PurchaseOrderRepository;
import com.retailflow.modules.purchases.repository.SupplierRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PurchaseServiceTest {

    @Mock
    private SupplierRepository supplierRepository;

    @Mock
    private PurchaseOrderRepository purchaseOrderRepository;

    @Mock
    private ProductRepository productRepository;

    @Mock
    private StockMovementRepository stockMovementRepository;

    @InjectMocks
    private PurchaseService purchaseService;

    private Supplier testSupplier;
    private Product testProduct;

    @BeforeEach
    void setUp() {
        testSupplier = new Supplier();
        testSupplier.setId("sup-1");
        testSupplier.setName("Metro Cash & Carry India");
        testSupplier.setGstin("29AAACM1234F1Z5");

        testProduct = new Product();
        testProduct.setId("prod-1");
        testProduct.setSku("RICE-1");
        testProduct.setName("Basmati Rice 5kg");
        testProduct.setStockOnHand(15);
        testProduct.setPurchasePrice(new BigDecimal("400.00"));
        testProduct.setLocation("Warehouse A");
    }

    @Test
    @DisplayName("PO creation MUST NOT increase product stock on hand")
    void testCreatePurchaseOrderDoesNotIncreaseStock() {
        when(supplierRepository.findById("sup-1")).thenReturn(Optional.of(testSupplier));
        when(productRepository.findById("prod-1")).thenReturn(Optional.of(testProduct));
        when(purchaseOrderRepository.save(any(PurchaseOrder.class))).thenAnswer(invocation -> invocation.getArgument(0));

        PurchaseDtos.CreateOrderItemRequest itemReq = new PurchaseDtos.CreateOrderItemRequest();
        itemReq.setProductId("prod-1");
        itemReq.setQuantity(50);
        itemReq.setUnitCost(new BigDecimal("400.00"));
        itemReq.setGstRate(new BigDecimal("5.00"));

        PurchaseDtos.CreatePurchaseOrderRequest req = new PurchaseDtos.CreatePurchaseOrderRequest();
        req.setSupplierId("sup-1");
        req.setExpectedDate(LocalDate.now().plusDays(5));
        req.setItems(List.of(itemReq));

        PurchaseDtos.PurchaseOrderDto created = purchaseService.createPurchaseOrder(req);

        assertNotNull(created);
        assertEquals("ORDERED", created.getStatus());
        assertEquals("Metro Cash & Carry India", created.getSupplierName());
        assertEquals(1, created.getItems().size());
        assertEquals(50, created.getItems().get(0).getQuantity());
        assertEquals(0, created.getItems().get(0).getReceivedQuantity());

        // CRITICAL CHECK: Product stock must NOT have changed
        assertEquals(15, testProduct.getStockOnHand());
        verify(productRepository, never()).save(any(Product.class));
        verify(stockMovementRepository, never()).save(any(StockMovement.class));
    }

    @Test
    @DisplayName("Receiving goods MUST increase stock on hand and create immutable StockMovement ledger entry")
    void testReceiveGoodsPartialAndFull() {
        PurchaseOrder po = new PurchaseOrder();
        po.setId("po-101");
        po.setPoNumber("PO-1001");
        po.setSupplierId("sup-1");
        po.setOrderDate(LocalDate.now());
        po.setStatus(PurchaseOrderStatus.ORDERED);

        PurchaseOrderItem item = new PurchaseOrderItem();
        item.setId("poi-1");
        item.setPurchaseOrder(po);
        item.setProductId("prod-1");
        item.setQuantity(50);
        item.setReceivedQuantity(0);
        item.setUnitCost(new BigDecimal("400.00"));
        item.setGstRate(new BigDecimal("5.00"));
        item.setTotalCost(new BigDecimal("21000.00"));

        po.setItems(new ArrayList<>(List.of(item)));

        when(purchaseOrderRepository.findById("po-101")).thenReturn(Optional.of(po));
        when(productRepository.findById("prod-1")).thenReturn(Optional.of(testProduct));
        when(supplierRepository.findById("sup-1")).thenReturn(Optional.of(testSupplier));
        when(purchaseOrderRepository.save(any(PurchaseOrder.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // 1. Partial receipt: receive 20 out of 50 units
        PurchaseDtos.ReceiveGoodsRequest partialReq = new PurchaseDtos.ReceiveGoodsRequest();
        partialReq.setReceivedBy("Inventory Staff Rajesh");
        partialReq.setItems(List.of(new PurchaseDtos.ReceiveItemRequest("prod-1", 20)));

        PurchaseDtos.PurchaseOrderDto result = purchaseService.receiveGoods("po-101", partialReq);

        assertNotNull(result);
        assertEquals("PARTIALLY_RECEIVED", result.getStatus());
        assertEquals(20, item.getReceivedQuantity());
        // Stock must increase from 15 to 35
        assertEquals(35, testProduct.getStockOnHand());

        ArgumentCaptor<StockMovement> movementCaptor = ArgumentCaptor.forClass(StockMovement.class);
        verify(stockMovementRepository, times(1)).save(movementCaptor.capture());
        StockMovement sm = movementCaptor.getValue();
        assertEquals("prod-1", sm.getProductId());
        assertEquals(20, sm.getQuantityDelta());
        assertEquals(15, sm.getPreviousStock());
        assertEquals(35, sm.getNewStock());
        assertEquals("PO-1001", sm.getReferenceId());
        assertEquals("PURCHASE", sm.getMovementType());
        assertEquals("Inventory Staff Rajesh", sm.getPerformedBy());

        // 2. Complete remaining receipt: receive remaining 30 units
        PurchaseDtos.ReceiveGoodsRequest completeReq = new PurchaseDtos.ReceiveGoodsRequest();
        completeReq.setReceivedBy("Inventory Staff Rajesh");
        completeReq.setItems(List.of(new PurchaseDtos.ReceiveItemRequest("prod-1", 30)));

        PurchaseDtos.PurchaseOrderDto completeResult = purchaseService.receiveGoods("po-101", completeReq);

        assertEquals("RECEIVED", completeResult.getStatus());
        assertEquals(50, item.getReceivedQuantity());
        // Stock must increase from 35 to 65
        assertEquals(65, testProduct.getStockOnHand());
        verify(stockMovementRepository, times(2)).save(any(StockMovement.class));
    }

    @Test
    @DisplayName("Receiving more than remaining ordered quantity must be rejected")
    void testReceiveGoodsExceedsOrderedQuantity() {
        PurchaseOrder po = new PurchaseOrder();
        po.setId("po-102");
        po.setPoNumber("PO-1002");
        po.setSupplierId("sup-1");
        po.setStatus(PurchaseOrderStatus.ORDERED);

        PurchaseOrderItem item = new PurchaseOrderItem();
        item.setId("poi-2");
        item.setPurchaseOrder(po);
        item.setProductId("prod-1");
        item.setQuantity(20);
        item.setReceivedQuantity(0);
        po.setItems(List.of(item));

        when(purchaseOrderRepository.findById("po-102")).thenReturn(Optional.of(po));

        PurchaseDtos.ReceiveGoodsRequest req = new PurchaseDtos.ReceiveGoodsRequest();
        req.setItems(List.of(new PurchaseDtos.ReceiveItemRequest("prod-1", 25))); // 25 > 20

        BusinessException exception = assertThrows(BusinessException.class, () ->
                purchaseService.receiveGoods("po-102", req)
        );

        assertEquals("EXCEEDS_ORDERED_QUANTITY", exception.getErrorCode());
        verify(productRepository, never()).save(any(Product.class));
        verify(stockMovementRepository, never()).save(any(StockMovement.class));
    }

    @Test
    @DisplayName("Cancelling an already received order must be rejected")
    void testCancelReceivedOrderFails() {
        PurchaseOrder po = new PurchaseOrder();
        po.setId("po-103");
        po.setPoNumber("PO-1003");
        po.setStatus(PurchaseOrderStatus.RECEIVED);

        when(purchaseOrderRepository.findById("po-103")).thenReturn(Optional.of(po));

        BusinessException exception = assertThrows(BusinessException.class, () ->
                purchaseService.cancelPurchaseOrder("po-103")
        );

        assertEquals("CANNOT_CANCEL", exception.getErrorCode());
    }
}
