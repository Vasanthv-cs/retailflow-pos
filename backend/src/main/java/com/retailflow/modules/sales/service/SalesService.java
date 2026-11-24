package com.retailflow.modules.sales.service;

import com.retailflow.common.api.PageResponse;
import com.retailflow.common.exception.BusinessException;
import com.retailflow.common.exception.InsufficientStockException;
import com.retailflow.common.exception.ResourceNotFoundException;
import com.retailflow.modules.catalog.entity.Product;
import com.retailflow.modules.catalog.repository.ProductRepository;
import com.retailflow.modules.inventory.entity.StockMovement;
import com.retailflow.modules.inventory.repository.StockMovementRepository;
import com.retailflow.modules.payments.entity.Payment;
import com.retailflow.modules.payments.repository.PaymentRepository;
import com.retailflow.modules.sales.dto.CheckoutDto;
import com.retailflow.modules.sales.entity.Sale;
import com.retailflow.modules.sales.entity.SaleItem;
import com.retailflow.modules.sales.repository.SaleRepository;
import com.retailflow.modules.realtime.RealtimeEvent;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.Year;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class SalesService {

    private final SaleRepository saleRepository;
    private final ProductRepository productRepository;
    private final StockMovementRepository stockMovementRepository;
    private final PaymentRepository paymentRepository;
    private final ApplicationEventPublisher eventPublisher;

    public SalesService(SaleRepository saleRepository,
                        ProductRepository productRepository,
                        StockMovementRepository stockMovementRepository,
                        PaymentRepository paymentRepository,
                        ApplicationEventPublisher eventPublisher) {
        this.saleRepository = saleRepository;
        this.productRepository = productRepository;
        this.stockMovementRepository = stockMovementRepository;
        this.paymentRepository = paymentRepository;
        this.eventPublisher = eventPublisher;
    }

    /**
     * Executes atomic POS checkout.
     * Guaranteed Properties:
     * - Idempotency: duplicate requests return existing completed invoice.
     * - Concurrency Safety: pessimistic locking on product records prevents overselling.
     * - Server-side recalculation: all prices, GST rates, taxable values, and discounts recalculated on server.
     * - Atomic Rollback: any failure leaves inventory completely untouched.
     */
    @Transactional(isolation = Isolation.READ_COMMITTED, rollbackFor = Exception.class)
    public CheckoutDto.SaleResponseDto completeCheckout(CheckoutDto.CheckoutRequest req) {
        // 1. Idempotency Check
        if (req.getIdempotencyKey() != null && !req.getIdempotencyKey().isBlank()) {
            var existing = saleRepository.findByIdempotencyKey(req.getIdempotencyKey().trim());
            if (existing.isPresent()) {
                return CheckoutDto.SaleResponseDto.fromEntity(existing.get());
            }
        }

        if (req.getItems() == null || req.getItems().isEmpty()) {
            throw new BusinessException("EMPTY_CART", "Cannot checkout with an empty cart");
        }

        // 2. Validate Items and Lock Products Pessimistically to Prevent Overselling
        List<Product> products = new ArrayList<>();
        for (CheckoutDto.CartItemRequest itemReq : req.getItems()) {
            if (itemReq.getQuantity() <= 0) {
                throw new BusinessException("INVALID_QUANTITY", "Quantity must be greater than zero for product " + itemReq.getProductId());
            }

            // Pessimistic write lock ensures serialized stock evaluation under high concurrency
            Product product = productRepository.findByIdForUpdate(itemReq.getProductId())
                    .orElseThrow(() -> new ResourceNotFoundException("Product", itemReq.getProductId()));

            int stock = product.getStockOnHand() != null ? product.getStockOnHand() : 0;
            if (stock < itemReq.getQuantity()) {
                throw new InsufficientStockException(product.getName(), product.getSku(), itemReq.getQuantity(), stock);
            }
            products.add(product);
        }

        // 3. Generate Unique Invoice Number and Primary Key
        String invoiceNumber = "INV-" + Year.now().getValue() + "-" + (10000 + (System.currentTimeMillis() % 90000));
        String saleId = "sale-" + UUID.randomUUID().toString().substring(0, 8);

        Sale sale = new Sale();
        sale.setId(saleId);
        sale.setStoreId(req.getStoreId() != null ? req.getStoreId() : "store-1");
        sale.setInvoiceNumber(invoiceNumber);
        sale.setIdempotencyKey(req.getIdempotencyKey());
        sale.setCashierId(req.getCashierId() != null ? req.getCashierId() : "emp-1");
        sale.setCustomerName(req.getCustomerName() != null && !req.getCustomerName().isBlank() ? req.getCustomerName() : "Walk-in Customer");
        sale.setCustomerPhone(req.getCustomerPhone());
        sale.setPaymentMethod(req.getPaymentMethod() != null ? req.getPaymentMethod() : "Cash");
        sale.setPaymentReference(req.getPaymentReference());
        sale.setDate(Instant.now());

        // 4. Recalculate Line Items, GST, and Decrement Stock
        BigDecimal subtotal = BigDecimal.ZERO;
        BigDecimal totalTax = BigDecimal.ZERO;
        BigDecimal estProfit = BigDecimal.ZERO;
        List<SaleItem> saleItems = new ArrayList<>();

        for (int i = 0; i < req.getItems().size(); i++) {
            CheckoutDto.CartItemRequest itemReq = req.getItems().get(i);
            Product product = products.get(i);

            int qty = itemReq.getQuantity();
            BigDecimal rate = product.getSellingPrice();
            BigDecimal cost = product.getPurchasePrice() != null ? product.getPurchasePrice() : BigDecimal.ZERO;
            BigDecimal gstRate = product.getGstRate() != null ? product.getGstRate() : BigDecimal.ZERO;

            BigDecimal lineGross = rate.multiply(BigDecimal.valueOf(qty));
            BigDecimal divisor = BigDecimal.ONE.add(gstRate.divide(BigDecimal.valueOf(100), 4, RoundingMode.HALF_UP));
            BigDecimal lineTaxable = lineGross.divide(divisor, 2, RoundingMode.HALF_UP);
            BigDecimal lineTax = lineGross.subtract(lineTaxable);
            BigDecimal lineProfit = lineTaxable.subtract(cost.multiply(BigDecimal.valueOf(qty)));

            subtotal = subtotal.add(lineTaxable);
            totalTax = totalTax.add(lineTax);
            estProfit = estProfit.add(lineProfit);

            SaleItem item = new SaleItem();
            item.setId("si-" + UUID.randomUUID().toString().substring(0, 8));
            item.setSale(sale);
            item.setProductId(product.getId());
            item.setQuantity(qty);
            item.setReturnedQuantity(0);
            item.setUnitPrice(rate);
            item.setPurchasePrice(cost);
            item.setGstRate(gstRate);
            item.setTaxAmount(lineTax);
            item.setLineTotal(lineGross);
            saleItems.add(item);

            // Decrement product inventory on hand
            int prevStock = product.getStockOnHand();
            int newStock = prevStock - qty;
            product.setStockOnHand(newStock);
            productRepository.save(product);

            // Record immutable stock movement ledger entry
            StockMovement movement = new StockMovement(
                    "sm-" + UUID.randomUUID().toString().substring(0, 8),
                    product.getId(),
                    "Sale",
                    -qty,
                    prevStock,
                    newStock,
                    invoiceNumber,
                    "Cashier Register (" + sale.getCashierId() + ")",
                    product.getLocation(),
                    "Billed under invoice " + invoiceNumber
            );
            stockMovementRepository.save(movement);
        }

        // 5. Discount Calculation
        BigDecimal grossTotal = subtotal.add(totalTax);
        BigDecimal discountAmt = BigDecimal.ZERO;
        if (req.getDiscountValue() != null && req.getDiscountValue().compareTo(BigDecimal.ZERO) > 0) {
            if ("percent".equalsIgnoreCase(req.getDiscountType())) {
                discountAmt = grossTotal.multiply(req.getDiscountValue()).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
            } else {
                discountAmt = req.getDiscountValue();
            }
        }

        BigDecimal finalTotal = grossTotal.subtract(discountAmt).setScale(2, RoundingMode.HALF_UP);
        BigDecimal cgst = totalTax.divide(BigDecimal.valueOf(2), 2, RoundingMode.HALF_UP);
        BigDecimal sgst = totalTax.subtract(cgst);

        sale.setSubtotal(subtotal.setScale(2, RoundingMode.HALF_UP));
        sale.setDiscountType(req.getDiscountType());
        sale.setDiscountValue(req.getDiscountValue() != null ? req.getDiscountValue() : BigDecimal.ZERO);
        sale.setDiscountAmount(discountAmt.setScale(2, RoundingMode.HALF_UP));
        sale.setCgstAmount(cgst);
        sale.setSgstAmount(sgst);
        sale.setTaxAmount(totalTax.setScale(2, RoundingMode.HALF_UP));
        sale.setTotalAmount(finalTotal);
        sale.setEstimatedProfit(estProfit.subtract(discountAmt).setScale(2, RoundingMode.HALF_UP));
        sale.setStatus("Completed");

        // 6. Tender & Change Calculation
        BigDecimal tendered = req.getAmountTendered() != null ? req.getAmountTendered() : finalTotal;
        BigDecimal change = tendered.subtract(finalTotal).max(BigDecimal.ZERO).setScale(2, RoundingMode.HALF_UP);
        sale.setAmountTendered(tendered.setScale(2, RoundingMode.HALF_UP));
        sale.setChangeDue(change);
        sale.setItems(saleItems);

        Sale savedSale = saleRepository.save(sale);

        // 7. Payment Ledger Records (Supports Single, Split, Cash, UPI, Card)
        if (req.getSplitPayments() != null && !req.getSplitPayments().isEmpty()) {
            BigDecimal splitSum = BigDecimal.ZERO;
            for (CheckoutDto.SplitPaymentItem split : req.getSplitPayments()) {
                splitSum = splitSum.add(split.getAmount());
                Payment payment = new Payment(
                        "pay-" + UUID.randomUUID().toString().substring(0, 8),
                        "Sale",
                        savedSale.getId(),
                        savedSale.getInvoiceNumber(),
                        split.getMethod(),
                        split.getAmount(),
                        split.getAmount(),
                        BigDecimal.ZERO,
                        split.getReference() != null ? split.getReference() : "SPLIT-" + invoiceNumber
                );
                paymentRepository.save(payment);
            }
        } else {
            Payment payment = new Payment(
                    "pay-" + UUID.randomUUID().toString().substring(0, 8),
                    "Sale",
                    savedSale.getId(),
                    savedSale.getInvoiceNumber(),
                    savedSale.getPaymentMethod(),
                    savedSale.getTotalAmount(),
                    tendered,
                    change,
                    req.getPaymentReference() != null ? req.getPaymentReference() : "TXN-" + invoiceNumber
            );
            paymentRepository.save(payment);
        }

        // Publish transactional real-time events (dispatched only AFTER commit)
        if (eventPublisher != null) {
            eventPublisher.publishEvent(new RealtimeEvent.NewSalePayload(
                    savedSale.getId(),
                    savedSale.getInvoiceNumber(),
                    savedSale.getCashierId(),
                    savedSale.getCustomerName(),
                    savedSale.getTotalAmount(),
                    savedSale.getItems().size(),
                    savedSale.getPaymentMethod(),
                    savedSale.getDate()
            ));

            for (SaleItem item : savedSale.getItems()) {
                Product p = products.stream()
                        .filter(prod -> prod.getId().equals(item.getProductId()))
                        .findFirst()
                        .orElse(null);
                if (p != null) {
                    eventPublisher.publishEvent(new RealtimeEvent.InventoryChangePayload(
                            p.getId(),
                            p.getSku(),
                            p.getName(),
                            -item.getQuantity(),
                            p.getStockOnHand() + item.getQuantity(),
                            p.getStockOnHand(),
                            p.getLowStockThreshold(),
                            "Cashier Register (" + savedSale.getCashierId() + ")",
                            "Sale " + savedSale.getInvoiceNumber()
                    ));
                }
            }
        }

        return CheckoutDto.SaleResponseDto.fromEntity(savedSale);
    }

    @Transactional(readOnly = true)
    public List<CheckoutDto.SaleResponseDto> getAllSales(Instant start, Instant end, String cashierId) {
        List<Sale> sales;
        if (start != null && end != null) {
            sales = saleRepository.findByDateBetweenOrderByDateDesc(start, end);
        } else if (cashierId != null && !cashierId.isBlank()) {
            sales = saleRepository.findByCashierIdOrderByDateDesc(cashierId);
        } else {
            sales = saleRepository.findAllByOrderByDateDesc();
        }

        return sales.stream().map(CheckoutDto.SaleResponseDto::fromEntity).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public PageResponse<CheckoutDto.SaleResponseDto> getPaginatedSales(int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("date").descending());
        Page<Sale> paged = saleRepository.findAll(pageable);
        List<CheckoutDto.SaleResponseDto> dtos = paged.getContent().stream()
                .map(CheckoutDto.SaleResponseDto::fromEntity)
                .collect(Collectors.toList());
        return PageResponse.of(dtos, paged.getNumber(), paged.getSize(), paged.getTotalElements());
    }

    @Transactional(readOnly = true)
    public CheckoutDto.SaleResponseDto getSaleById(String id) {
        Sale sale = saleRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Sale", id));
        return CheckoutDto.SaleResponseDto.fromEntity(sale);
    }

    @Transactional(readOnly = true)
    public CheckoutDto.SaleResponseDto getSaleByInvoiceNumber(String invoiceNumber) {
        Sale sale = saleRepository.findByInvoiceNumber(invoiceNumber.trim())
                .orElseThrow(() -> new ResourceNotFoundException("Invoice", invoiceNumber));
        return CheckoutDto.SaleResponseDto.fromEntity(sale);
    }
}
