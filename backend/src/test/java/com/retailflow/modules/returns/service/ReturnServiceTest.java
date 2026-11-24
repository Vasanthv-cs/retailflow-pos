package com.retailflow.modules.returns.service;

import com.retailflow.common.exception.BusinessException;
import com.retailflow.modules.catalog.entity.Product;
import com.retailflow.modules.catalog.repository.ProductRepository;
import com.retailflow.modules.inventory.entity.StockMovement;
import com.retailflow.modules.inventory.repository.StockMovementRepository;
import com.retailflow.modules.payments.entity.Payment;
import com.retailflow.modules.payments.repository.PaymentRepository;
import com.retailflow.modules.returns.dto.ReturnDto;
import com.retailflow.modules.returns.entity.ReturnRecord;
import com.retailflow.modules.returns.repository.ReturnRepository;
import com.retailflow.modules.sales.entity.Sale;
import com.retailflow.modules.sales.entity.SaleItem;
import com.retailflow.modules.sales.repository.SaleRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ReturnServiceTest {

    @Mock
    private ReturnRepository returnRepository;

    @Mock
    private SaleRepository saleRepository;

    @Mock
    private ProductRepository productRepository;

    @Mock
    private StockMovementRepository stockMovementRepository;

    @Mock
    private PaymentRepository paymentRepository;

    @InjectMocks
    private ReturnService returnService;

    private Sale testSale;
    private SaleItem testSaleItem;
    private Product testProduct;

    @BeforeEach
    void setUp() {
        testProduct = new Product();
        testProduct.setId("prod-1");
        testProduct.setName("Basmati Rice 5kg");
        testProduct.setSku("RICE-5KG");
        testProduct.setStockOnHand(20);
        testProduct.setLocation("Aisle 1");

        testSale = new Sale();
        testSale.setId("sale-1");
        testSale.setInvoiceNumber("INV-2026-1001");
        testSale.setCustomerName("Sunita Devi");
        testSale.setStatus("Completed");

        testSaleItem = new SaleItem();
        testSaleItem.setId("si-1");
        testSaleItem.setSale(testSale);
        testSaleItem.setProductId("prod-1");
        testSaleItem.setQuantity(5);
        testSaleItem.setReturnedQuantity(0);
        testSaleItem.setUnitPrice(new BigDecimal("500.00"));
        testSaleItem.setLineTotal(new BigDecimal("2500.00")); // 5 * 500

        testSale.setItems(new ArrayList<>(List.of(testSaleItem)));
    }

    @Test
    @DisplayName("Should process return of sellable item, restock inventory, and update sale status to Partial Return")
    void testProcessReturnSellableRestocksInventory() {
        when(saleRepository.findById("sale-1")).thenReturn(Optional.of(testSale));
        when(productRepository.findById("prod-1")).thenReturn(Optional.of(testProduct));
        when(returnRepository.save(any(ReturnRecord.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ReturnDto.ProcessReturnRequest req = new ReturnDto.ProcessReturnRequest();
        req.setSaleId("sale-1");
        req.setReason("Excess purchase");
        req.setRefundMethod("Cash");
        req.setProcessedBy("Manager John");

        ReturnDto.ReturnItemRequest itemReq = new ReturnDto.ReturnItemRequest();
        itemReq.setProductId("prod-1");
        itemReq.setQuantity(2); // 2 out of 5
        itemReq.setCondition("Sellable");
        req.setItems(List.of(itemReq));

        ReturnRecord result = returnService.processReturn(req);

        assertNotNull(result);
        assertEquals(new BigDecimal("1000.00"), result.getTotalRefund()); // 2 * 500
        assertEquals("Cash", result.getRefundMethod());
        assertEquals("INV-2026-1001", result.getInvoiceNumber());

        // Verify sellable stock incremented from 20 to 22
        assertEquals(22, testProduct.getStockOnHand());

        // Verify sale item updated returned quantity
        assertEquals(2, testSaleItem.getReturnedQuantity());
        assertEquals("Partial Return", testSale.getStatus());

        // Verify immutable StockMovement logged
        ArgumentCaptor<StockMovement> captor = ArgumentCaptor.forClass(StockMovement.class);
        verify(stockMovementRepository, times(1)).save(captor.capture());
        StockMovement movement = captor.getValue();
        assertEquals(2, movement.getQuantityDelta());
        assertEquals(20, movement.getPreviousStock());
        assertEquals(22, movement.getNewStock());
        assertEquals("Return", movement.getMovementType());

        // Verify separate refund payment created
        verify(paymentRepository, times(1)).save(any(Payment.class));
    }

    @Test
    @DisplayName("Damaged return must NOT increment sellable stock")
    void testProcessReturnDamagedDoesNotRestock() {
        when(saleRepository.findById("sale-1")).thenReturn(Optional.of(testSale));
        when(productRepository.findById("prod-1")).thenReturn(Optional.of(testProduct));
        when(returnRepository.save(any(ReturnRecord.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ReturnDto.ProcessReturnRequest req = new ReturnDto.ProcessReturnRequest();
        req.setSaleId("sale-1");
        req.setReason("Damaged packaging");
        req.setRefundMethod("UPI");

        ReturnDto.ReturnItemRequest itemReq = new ReturnDto.ReturnItemRequest();
        itemReq.setProductId("prod-1");
        itemReq.setQuantity(1);
        itemReq.setCondition("Damaged");
        req.setItems(List.of(itemReq));

        ReturnRecord result = returnService.processReturn(req);

        assertNotNull(result);
        assertEquals(new BigDecimal("500.00"), result.getTotalRefund());

        // CRITICAL CHECK: Damaged item must NOT increase stockOnHand (must remain 20)
        assertEquals(20, testProduct.getStockOnHand());
        verify(productRepository, never()).save(testProduct);
    }

    @Test
    @DisplayName("Should reject return if requested quantity exceeds original purchase or balance")
    void testReturnExceedsPurchasedQuantityThrows() {
        when(saleRepository.findById("sale-1")).thenReturn(Optional.of(testSale));

        ReturnDto.ProcessReturnRequest req = new ReturnDto.ProcessReturnRequest();
        req.setSaleId("sale-1");
        req.setReason("Wrong product");
        req.setRefundMethod("Cash");

        ReturnDto.ReturnItemRequest itemReq = new ReturnDto.ReturnItemRequest();
        itemReq.setProductId("prod-1");
        itemReq.setQuantity(6); // 6 > 5 purchased
        itemReq.setCondition("Sellable");
        req.setItems(List.of(itemReq));

        BusinessException exception = assertThrows(BusinessException.class, () ->
                returnService.processReturn(req)
        );

        assertEquals("EXCEEDS_RETURN_LIMIT", exception.getErrorCode());
        verify(returnRepository, never()).save(any(ReturnRecord.class));
        verify(paymentRepository, never()).save(any(Payment.class));
    }
}
