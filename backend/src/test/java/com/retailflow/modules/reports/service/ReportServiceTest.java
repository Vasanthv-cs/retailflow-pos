package com.retailflow.modules.reports.service;

import com.retailflow.modules.catalog.entity.Category;
import com.retailflow.modules.catalog.entity.Product;
import com.retailflow.modules.catalog.repository.CategoryRepository;
import com.retailflow.modules.catalog.repository.ProductRepository;
import com.retailflow.modules.payments.entity.Payment;
import com.retailflow.modules.payments.repository.PaymentRepository;
import com.retailflow.modules.purchases.repository.PurchaseOrderRepository;
import com.retailflow.modules.purchases.repository.SupplierRepository;
import com.retailflow.modules.reports.dto.ReportDtos;
import com.retailflow.modules.returns.repository.ReturnRepository;
import com.retailflow.modules.sales.entity.Sale;
import com.retailflow.modules.sales.entity.SaleItem;
import com.retailflow.modules.sales.repository.SaleRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ReportServiceTest {

    @Mock
    private SaleRepository saleRepository;

    @Mock
    private ProductRepository productRepository;

    @Mock
    private CategoryRepository categoryRepository;

    @Mock
    private ReturnRepository returnRepository;

    @Mock
    private PaymentRepository paymentRepository;

    @Mock
    private PurchaseOrderRepository purchaseOrderRepository;

    @Mock
    private SupplierRepository supplierRepository;

    @InjectMocks
    private ReportService reportService;

    private Sale sale1;
    private Sale sale2;

    @BeforeEach
    void setUp() {
        sale1 = new Sale();
        sale1.setId("s-1");
        sale1.setSubtotal(new BigDecimal("1000.00"));
        sale1.setTaxAmount(new BigDecimal("50.00"));
        sale1.setTotalAmount(new BigDecimal("1050.00"));
        sale1.setEstimatedProfit(new BigDecimal("200.00"));
        sale1.setStatus("Completed");

        sale2 = new Sale();
        sale2.setId("s-2");
        sale2.setSubtotal(new BigDecimal("2000.00"));
        sale2.setTaxAmount(new BigDecimal("100.00"));
        sale2.setTotalAmount(new BigDecimal("2100.00"));
        sale2.setEstimatedProfit(new BigDecimal("400.00"));
        sale2.setStatus("Completed");
    }

    @Test
    @DisplayName("Should aggregate KPI metrics accurately with BigDecimal precision")
    void testGetSummaryKpis() {
        when(saleRepository.findAll()).thenReturn(List.of(sale1, sale2));

        ReportDtos.SummaryKpis kpis = reportService.getSummaryKpis();

        assertNotNull(kpis);
        assertEquals(2, kpis.getInvoiceCount());
        assertEquals(new BigDecimal("3150.00"), kpis.getTotalRevenue()); // 1050 + 2100
        assertEquals(new BigDecimal("3000.00"), kpis.getTaxableSales()); // 1000 + 2000
        assertEquals(new BigDecimal("150.00"), kpis.getTotalGst());      // 50 + 100
        assertEquals(new BigDecimal("600.00"), kpis.getGrossProfit());   // 200 + 400
    }

    @Test
    @DisplayName("Should accurately summarize payments by tender type")
    void testGetPaymentMethodSummary() {
        Payment p1 = new Payment("p-1", "Sale", "s-1", "INV-1", "Cash", new BigDecimal("1000.00"), new BigDecimal("1000.00"), BigDecimal.ZERO, "R1");
        Payment p2 = new Payment("p-2", "Sale", "s-2", "INV-2", "UPI", new BigDecimal("2000.00"), new BigDecimal("2000.00"), BigDecimal.ZERO, "R2");
        Payment p3 = new Payment("p-3", "Sale", "s-3", "INV-3", "Cash", new BigDecimal("1000.00"), new BigDecimal("1000.00"), BigDecimal.ZERO, "R3");

        when(paymentRepository.findAll()).thenReturn(List.of(p1, p2, p3));

        List<ReportDtos.PaymentMethodSummary> summaries = reportService.getPaymentMethodSummary();

        assertNotNull(summaries);
        assertEquals(2, summaries.size()); // Cash and UPI

        ReportDtos.PaymentMethodSummary cash = summaries.stream().filter(s -> "Cash".equals(s.getMethod())).findFirst().orElse(null);
        ReportDtos.PaymentMethodSummary upi = summaries.stream().filter(s -> "UPI".equals(s.getMethod())).findFirst().orElse(null);

        assertNotNull(cash);
        assertNotNull(upi);

        assertEquals(new BigDecimal("2000.00"), cash.getTotalAmount());
        assertEquals(2, cash.getTransactionCount());
        assertEquals(new BigDecimal("50.00"), cash.getPercentageOfRevenue()); // 2000 / 4000 = 50%

        assertEquals(new BigDecimal("2000.00"), upi.getTotalAmount());
        assertEquals(1, upi.getTransactionCount());
        assertEquals(new BigDecimal("50.00"), upi.getPercentageOfRevenue()); // 2000 / 4000 = 50%
    }
}
