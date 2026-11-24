package com.retailflow.modules.reports.controller;

import com.retailflow.common.api.ApiResponse;
import com.retailflow.modules.reports.dto.ReportDtos;
import com.retailflow.modules.reports.service.ReportService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.List;

@RestController
@RequestMapping("/api/v1/reports")
@PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'ACCOUNTANT')")
public class ReportController {

    private final ReportService reportService;

    public ReportController(ReportService reportService) {
        this.reportService = reportService;
    }

    @GetMapping("/summary")
    public ApiResponse<ReportDtos.SummaryKpis> getSummary() {
        return ApiResponse.ok(reportService.getSummaryKpis());
    }

    @GetMapping("/summary-by-date")
    public ApiResponse<ReportDtos.SummaryKpis> getDateRangeSummary(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant endDate) {
        return ApiResponse.ok(reportService.getDateRangeKpis(startDate, endDate));
    }

    @GetMapping("/gstr1")
    public ApiResponse<List<ReportDtos.Gstr1Slab>> getGstr1() {
        return ApiResponse.ok(reportService.getGstr1Report());
    }

    @GetMapping("/daily-trends")
    public ApiResponse<List<ReportDtos.DailyTrend>> getDailyTrends() {
        return ApiResponse.ok(reportService.getDailyTrends());
    }

    @GetMapping("/by-category")
    public ApiResponse<List<ReportDtos.CategorySalesSummary>> getSalesByCategory() {
        return ApiResponse.ok(reportService.getSalesByCategory());
    }

    @GetMapping("/by-product")
    public ApiResponse<List<ReportDtos.ProductSalesSummary>> getSalesByProduct() {
        return ApiResponse.ok(reportService.getSalesByProduct());
    }

    @GetMapping("/payment-summary")
    public ApiResponse<List<ReportDtos.PaymentMethodSummary>> getPaymentMethodSummary() {
        return ApiResponse.ok(reportService.getPaymentMethodSummary());
    }

    @GetMapping("/purchases-summary")
    public ApiResponse<ReportDtos.PurchaseSupplierSummary> getPurchasesSummary() {
        return ApiResponse.ok(reportService.getPurchaseSupplierSummary());
    }

    @GetMapping("/returns-summary")
    public ApiResponse<ReportDtos.ReturnsSummary> getReturnsSummary() {
        return ApiResponse.ok(reportService.getReturnsSummary());
    }
}
