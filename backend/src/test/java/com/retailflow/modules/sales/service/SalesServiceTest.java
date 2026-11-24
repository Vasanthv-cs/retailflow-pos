package com.retailflow.modules.sales.service;

import com.retailflow.common.exception.BusinessException;
import com.retailflow.common.exception.InsufficientStockException;
import com.retailflow.modules.catalog.entity.Product;
import com.retailflow.modules.catalog.repository.ProductRepository;
import com.retailflow.modules.inventory.entity.StockMovement;
import com.retailflow.modules.inventory.repository.StockMovementRepository;
import com.retailflow.modules.payments.entity.Payment;
import com.retailflow.modules.payments.repository.PaymentRepository;
import com.retailflow.modules.sales.dto.CheckoutDto;
import com.retailflow.modules.sales.entity.Sale;
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
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SalesServiceTest {

    @Mock
    private SaleRepository saleRepository;

    @Mock
    private ProductRepository productRepository;

    @Mock
    private StockMovementRepository stockMovementRepository;

    @Mock
    private PaymentRepository paymentRepository;

    @InjectMocks
    private SalesService salesService;

    private Product productRice;
    private Product productOil;

    @BeforeEach
    void setUp() {
        productRice = new Product();
        productRice.setId("prod-1");
        productRice.setName("Basmati Rice 5kg");
        productRice.setSku("RICE-5KG");
        productRice.setPurchasePrice(new BigDecimal("400.00"));
        productRice.setSellingPrice(new BigDecimal("500.00"));
        productRice.setGstRate(new BigDecimal("5.00"));
        productRice.setStockOnHand(30);
        productRice.setLocation("Aisle 1");

        productOil = new Product();
        productOil.setId("prod-2");
        productOil.setName("Sunflower Oil 1L");
        productOil.setSku("OIL-1L");
        productOil.setPurchasePrice(new BigDecimal("120.00"));
        productOil.setSellingPrice(new BigDecimal("150.00"));
        productOil.setGstRate(new BigDecimal("5.00"));
        productOil.setStockOnHand(10);
        productOil.setLocation("Aisle 2");
    }

    @Test
    @DisplayName("Should successfully process checkout, recalculate GST, decrement inventory, and record stock movement")
    void testCompleteCheckoutSuccess() {
        when(productRepository.findByIdForUpdate("prod-1")).thenReturn(Optional.of(productRice));
        when(productRepository.findByIdForUpdate("prod-2")).thenReturn(Optional.of(productOil));
        when(saleRepository.save(any(Sale.class))).thenAnswer(invocation -> invocation.getArgument(0));

        CheckoutDto.CheckoutRequest req = new CheckoutDto.CheckoutRequest();
        req.setCashierId("cashier-101");
        req.setCustomerName("Sunita Devi");
        req.setPaymentMethod("Cash");
        req.setAmountTendered(new BigDecimal("1000.00"));
        req.setDiscountType("percent");
        req.setDiscountValue(new BigDecimal("10.00")); // 10% discount

        req.setItems(List.of(
                new CheckoutDto.CartItemRequest("prod-1", 1), // 500
                new CheckoutDto.CartItemRequest("prod-2", 2)  // 300
        )); // Gross total: 800.00, 10% off: 720.00

        CheckoutDto.SaleResponseDto response = salesService.completeCheckout(req);

        assertNotNull(response);
        assertEquals("Sunita Devi", response.getCustomerName());
        assertEquals(new BigDecimal("720.00"), response.getTotalAmount());
        assertEquals(new BigDecimal("80.00"), response.getDiscountAmount());
        assertEquals(new BigDecimal("280.00"), response.getChangeDue()); // 1000 tendered - 720
        assertEquals("Completed", response.getStatus());

        // Verify stock decremented
        assertEquals(29, productRice.getStockOnHand()); // 30 - 1
        assertEquals(8, productOil.getStockOnHand());   // 10 - 2

        // Verify stock movements logged
        ArgumentCaptor<StockMovement> movementCaptor = ArgumentCaptor.forClass(StockMovement.class);
        verify(stockMovementRepository, times(2)).save(movementCaptor.capture());
        List<StockMovement> movements = movementCaptor.getAllValues();
        assertEquals(-1, movements.get(0).getQuantityDelta());
        assertEquals(-2, movements.get(1).getQuantityDelta());

        // Verify payment record
        verify(paymentRepository, times(1)).save(any(Payment.class));
    }

    @Test
    @DisplayName("Should reject checkout and rollback if any item has insufficient stock")
    void testCheckoutInsufficientStockThrowsAndRollsBack() {
        when(productRepository.findByIdForUpdate("prod-2")).thenReturn(Optional.of(productOil));

        CheckoutDto.CheckoutRequest req = new CheckoutDto.CheckoutRequest();
        req.setItems(List.of(new CheckoutDto.CartItemRequest("prod-2", 15))); // Stock is 10, requested 15

        InsufficientStockException exception = assertThrows(InsufficientStockException.class, () ->
                salesService.completeCheckout(req)
        );

        assertTrue(exception.getMessage().contains("Insufficient stock"));
        // Stock must remain unchanged
        assertEquals(10, productOil.getStockOnHand());
        verify(saleRepository, never()).save(any(Sale.class));
        verify(stockMovementRepository, never()).save(any(StockMovement.class));
        verify(paymentRepository, never()).save(any(Payment.class));
    }

    @Test
    @DisplayName("Idempotency: duplicate request with same key returns existing sale without double charging")
    void testIdempotencyReturnsExistingSale() {
        Sale existingSale = new Sale();
        existingSale.setId("sale-existing-1");
        existingSale.setInvoiceNumber("INV-2026-9999");
        existingSale.setIdempotencyKey("IDEMP-KEY-ABC");
        existingSale.setTotalAmount(new BigDecimal("500.00"));
        existingSale.setStatus("Completed");

        when(saleRepository.findByIdempotencyKey("IDEMP-KEY-ABC")).thenReturn(Optional.of(existingSale));

        CheckoutDto.CheckoutRequest req = new CheckoutDto.CheckoutRequest();
        req.setIdempotencyKey("IDEMP-KEY-ABC");
        req.setItems(List.of(new CheckoutDto.CartItemRequest("prod-1", 1)));

        CheckoutDto.SaleResponseDto result = salesService.completeCheckout(req);

        assertNotNull(result);
        assertEquals("INV-2026-9999", result.getInvoiceNumber());
        assertEquals("IDEMP-KEY-ABC", result.getIdempotencyKey());

        // Product repository or stock movement should never have been touched
        verify(productRepository, never()).findByIdForUpdate(any());
        verify(stockMovementRepository, never()).save(any());
    }

    @Test
    @DisplayName("Split payments: records multiple payment entries for split tender")
    void testSplitPaymentsRecordMultipleEntries() {
        when(productRepository.findByIdForUpdate("prod-1")).thenReturn(Optional.of(productRice));
        when(saleRepository.save(any(Sale.class))).thenAnswer(invocation -> invocation.getArgument(0));

        CheckoutDto.CheckoutRequest req = new CheckoutDto.CheckoutRequest();
        req.setPaymentMethod("Split");
        req.setItems(List.of(new CheckoutDto.CartItemRequest("prod-1", 1))); // 500.00
        req.setSplitPayments(List.of(
                new CheckoutDto.SplitPaymentItem("Cash", new BigDecimal("300.00"), "CASH-SPLIT"),
                new CheckoutDto.SplitPaymentItem("UPI", new BigDecimal("200.00"), "UPI-SPLIT-REF")
        ));

        CheckoutDto.SaleResponseDto response = salesService.completeCheckout(req);

        assertNotNull(response);
        assertEquals(new BigDecimal("500.00"), response.getTotalAmount());

        // Verify two payment records were saved
        verify(paymentRepository, times(2)).save(any(Payment.class));
    }
}
