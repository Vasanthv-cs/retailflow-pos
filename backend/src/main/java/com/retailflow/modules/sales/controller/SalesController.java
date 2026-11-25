package com.retailflow.modules.sales.controller;

import com.retailflow.common.api.ApiResponse;
import com.retailflow.common.api.PageResponse;
import com.retailflow.modules.sales.dto.CheckoutDto;
import com.retailflow.modules.sales.service.SalesService;
import jakarta.validation.Valid;
import org.springframework.dao.CannotAcquireLockException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.DeadlockLoserDataAccessException;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;

@RestController
@RequestMapping("/api/v1/sales")
public class SalesController {

    private final SalesService salesService;

    public SalesController(SalesService salesService) {
        this.salesService = salesService;
    }

    @PostMapping("/checkout")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'CASHIER')")
    public ApiResponse<CheckoutDto.SaleResponseDto> checkout(@Valid @RequestBody CheckoutDto.CheckoutRequest request) {
        int attempts = 0;
        while (true) {
            try {
                return ApiResponse.created(salesService.completeCheckout(request), "Checkout completed successfully");
            } catch (CannotAcquireLockException | DeadlockLoserDataAccessException ex) {
                attempts++;
                if (attempts >= 3) {
                    throw ex;
                }
            } catch (DataIntegrityViolationException ex) {
                if (request.getIdempotencyKey() != null && !request.getIdempotencyKey().isBlank()) {
                    return ApiResponse.created(salesService.completeCheckout(request), "Checkout completed successfully");
                }
                throw ex;
            }
        }
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'CASHIER', 'ACCOUNTANT')")
    public ApiResponse<List<CheckoutDto.SaleResponseDto>> getSales(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant endDate,
            @RequestParam(required = false) String cashierId) {
        return ApiResponse.ok(salesService.getAllSales(startDate, endDate, cashierId));
    }

    @GetMapping("/paginated")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'CASHIER', 'ACCOUNTANT')")
    public ApiResponse<PageResponse<CheckoutDto.SaleResponseDto>> getPaginatedSales(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ApiResponse.ok(salesService.getPaginatedSales(page, size));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'CASHIER', 'ACCOUNTANT')")
    public ApiResponse<CheckoutDto.SaleResponseDto> getSaleById(@PathVariable String id) {
        return ApiResponse.ok(salesService.getSaleById(id));
    }

    @GetMapping("/by-invoice/{invoiceNumber}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'CASHIER', 'ACCOUNTANT')")
    public ApiResponse<CheckoutDto.SaleResponseDto> getSaleByInvoice(@PathVariable String invoiceNumber) {
        return ApiResponse.ok(salesService.getSaleByInvoiceNumber(invoiceNumber));
    }
}
