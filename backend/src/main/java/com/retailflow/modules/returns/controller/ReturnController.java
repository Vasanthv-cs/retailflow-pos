package com.retailflow.modules.returns.controller;

import com.retailflow.common.api.ApiResponse;
import com.retailflow.modules.returns.dto.ReturnDto;
import com.retailflow.modules.returns.entity.ReturnRecord;
import com.retailflow.modules.returns.service.ReturnService;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/returns")
public class ReturnController {

    private final ReturnService returnService;

    public ReturnController(ReturnService returnService) {
        this.returnService = returnService;
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'CASHIER')")
    public ApiResponse<ReturnRecord> processReturn(@Valid @RequestBody ReturnDto.ProcessReturnRequest request) {
        return ApiResponse.created(returnService.processReturn(request), "Return and refund processed successfully");
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'CASHIER', 'ACCOUNTANT')")
    public ApiResponse<List<ReturnRecord>> getReturns() {
        return ApiResponse.ok(returnService.getAllReturns());
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'CASHIER', 'ACCOUNTANT')")
    public ApiResponse<ReturnRecord> getReturnById(@PathVariable String id) {
        return ApiResponse.ok(returnService.getReturnById(id));
    }

    @GetMapping("/by-invoice/{invoiceNumber}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'CASHIER', 'ACCOUNTANT')")
    public ApiResponse<List<ReturnRecord>> getReturnsByInvoice(@PathVariable String invoiceNumber) {
        return ApiResponse.ok(returnService.getReturnsByInvoiceNumber(invoiceNumber));
    }
}
