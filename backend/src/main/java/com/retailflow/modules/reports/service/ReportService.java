package com.retailflow.modules.reports.service;

import com.retailflow.modules.catalog.entity.Category;
import com.retailflow.modules.catalog.entity.Product;
import com.retailflow.modules.catalog.repository.CategoryRepository;
import com.retailflow.modules.catalog.repository.ProductRepository;
import com.retailflow.modules.payments.entity.Payment;
import com.retailflow.modules.payments.repository.PaymentRepository;
import com.retailflow.modules.purchases.entity.PurchaseOrder;
import com.retailflow.modules.purchases.entity.PurchaseOrderStatus;
import com.retailflow.modules.purchases.repository.PurchaseOrderRepository;
import com.retailflow.modules.purchases.repository.SupplierRepository;
import com.retailflow.modules.reports.dto.ReportDtos;
import com.retailflow.modules.returns.entity.ReturnItem;
import com.retailflow.modules.returns.entity.ReturnRecord;
import com.retailflow.modules.returns.repository.ReturnRepository;
import com.retailflow.modules.sales.entity.Sale;
import com.retailflow.modules.sales.entity.SaleItem;
import com.retailflow.modules.sales.repository.SaleRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class ReportService {

    private final SaleRepository saleRepository;
    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;
    private final ReturnRepository returnRepository;
    private final PaymentRepository paymentRepository;
    private final PurchaseOrderRepository purchaseOrderRepository;
    private final SupplierRepository supplierRepository;

    public ReportService(SaleRepository saleRepository,
                         ProductRepository productRepository,
                         CategoryRepository categoryRepository,
                         ReturnRepository returnRepository,
                         PaymentRepository paymentRepository,
                         PurchaseOrderRepository purchaseOrderRepository,
                         SupplierRepository supplierRepository) {
        this.saleRepository = saleRepository;
        this.productRepository = productRepository;
        this.categoryRepository = categoryRepository;
        this.returnRepository = returnRepository;
        this.paymentRepository = paymentRepository;
        this.purchaseOrderRepository = purchaseOrderRepository;
        this.supplierRepository = supplierRepository;
    }

    @Transactional(readOnly = true)
    public ReportDtos.SummaryKpis getSummaryKpis() {
        List<Sale> sales = saleRepository.findAll();
        BigDecimal rev = BigDecimal.ZERO;
        BigDecimal taxBase = BigDecimal.ZERO;
        BigDecimal gst = BigDecimal.ZERO;
        BigDecimal profit = BigDecimal.ZERO;
        int count = 0;

        for (Sale s : sales) {
            if (!"Returned".equalsIgnoreCase(s.getStatus())) {
                rev = rev.add(s.getTotalAmount());
                taxBase = taxBase.add(s.getSubtotal());
                gst = gst.add(s.getTaxAmount());
                profit = profit.add(s.getEstimatedProfit() != null ? s.getEstimatedProfit() : BigDecimal.ZERO);
                count++;
            }
        }

        return new ReportDtos.SummaryKpis(
                rev.setScale(2, RoundingMode.HALF_UP),
                taxBase.setScale(2, RoundingMode.HALF_UP),
                gst.setScale(2, RoundingMode.HALF_UP),
                profit.setScale(2, RoundingMode.HALF_UP),
                count
        );
    }

    @Transactional(readOnly = true)
    public ReportDtos.SummaryKpis getDateRangeKpis(Instant start, Instant end) {
        List<Sale> sales = (start != null && end != null)
                ? saleRepository.findByDateBetweenOrderByDateDesc(start, end)
                : saleRepository.findAll();

        BigDecimal rev = BigDecimal.ZERO;
        BigDecimal taxBase = BigDecimal.ZERO;
        BigDecimal gst = BigDecimal.ZERO;
        BigDecimal profit = BigDecimal.ZERO;
        int count = 0;

        for (Sale s : sales) {
            if (!"Returned".equalsIgnoreCase(s.getStatus())) {
                rev = rev.add(s.getTotalAmount());
                taxBase = taxBase.add(s.getSubtotal());
                gst = gst.add(s.getTaxAmount());
                profit = profit.add(s.getEstimatedProfit() != null ? s.getEstimatedProfit() : BigDecimal.ZERO);
                count++;
            }
        }

        return new ReportDtos.SummaryKpis(
                rev.setScale(2, RoundingMode.HALF_UP),
                taxBase.setScale(2, RoundingMode.HALF_UP),
                gst.setScale(2, RoundingMode.HALF_UP),
                profit.setScale(2, RoundingMode.HALF_UP),
                count
        );
    }

    @Transactional(readOnly = true)
    public List<ReportDtos.Gstr1Slab> getGstr1Report() {
        Map<BigDecimal, BigDecimal[]> slabs = new TreeMap<>();
        for (BigDecimal r : Arrays.asList(BigDecimal.ZERO, BigDecimal.valueOf(5), BigDecimal.valueOf(12), BigDecimal.valueOf(18), BigDecimal.valueOf(28))) {
            slabs.put(r, new BigDecimal[]{BigDecimal.ZERO, BigDecimal.ZERO}); // [taxable, tax]
        }

        List<Sale> sales = saleRepository.findAll();
        for (Sale s : sales) {
            if (!"Returned".equalsIgnoreCase(s.getStatus())) {
                for (SaleItem item : s.getItems()) {
                    BigDecimal rate = item.getGstRate() != null ? item.getGstRate() : BigDecimal.ZERO;
                    BigDecimal[] accum = slabs.computeIfAbsent(rate, k -> new BigDecimal[]{BigDecimal.ZERO, BigDecimal.ZERO});
                    BigDecimal taxable = item.getLineTotal().subtract(item.getTaxAmount());
                    accum[0] = accum[0].add(taxable);
                    accum[1] = accum[1].add(item.getTaxAmount());
                }
            }
        }

        List<ReportDtos.Gstr1Slab> list = new ArrayList<>();
        for (Map.Entry<BigDecimal, BigDecimal[]> e : slabs.entrySet()) {
            BigDecimal taxable = e.getValue()[0].setScale(2, RoundingMode.HALF_UP);
            BigDecimal tax = e.getValue()[1].setScale(2, RoundingMode.HALF_UP);
            BigDecimal cgst = tax.divide(BigDecimal.valueOf(2), 2, RoundingMode.HALF_UP);
            BigDecimal sgst = tax.subtract(cgst);
            list.add(new ReportDtos.Gstr1Slab(e.getKey(), taxable, cgst, sgst, tax));
        }

        return list;
    }

    @Transactional(readOnly = true)
    public List<ReportDtos.DailyTrend> getDailyTrends() {
        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("dd MMM", Locale.forLanguageTag("en-IN"));
        LocalDate today = LocalDate.now();

        List<ReportDtos.DailyTrend> trends = new ArrayList<>();
        for (int i = 6; i >= 0; i--) {
            LocalDate d = today.minusDays(i);
            trends.add(new ReportDtos.DailyTrend(d.format(fmt), BigDecimal.ZERO, BigDecimal.ZERO));
        }

        return trends;
    }

    @Transactional(readOnly = true)
    public List<ReportDtos.CategorySalesSummary> getSalesByCategory() {
        Map<String, Category> catMap = categoryRepository.findAll().stream()
                .collect(Collectors.toMap(Category::getId, c -> c, (a, b) -> a));

        Map<String, Product> prodMap = productRepository.findAll().stream()
                .collect(Collectors.toMap(Product::getId, p -> p, (a, b) -> a));

        Map<String, BigDecimal> catRevenue = new HashMap<>();
        Map<String, Integer> catUnits = new HashMap<>();
        BigDecimal grandTotal = BigDecimal.ZERO;

        for (Sale sale : saleRepository.findAll()) {
            if ("Returned".equalsIgnoreCase(sale.getStatus())) continue;
            for (SaleItem item : sale.getItems()) {
                Product p = prodMap.get(item.getProductId());
                String catId = p != null ? p.getCategoryId() : "other";
                catRevenue.put(catId, catRevenue.getOrDefault(catId, BigDecimal.ZERO).add(item.getLineTotal()));
                catUnits.put(catId, catUnits.getOrDefault(catId, 0) + item.getQuantity());
                grandTotal = grandTotal.add(item.getLineTotal());
            }
        }

        List<ReportDtos.CategorySalesSummary> summaries = new ArrayList<>();
        for (Map.Entry<String, BigDecimal> entry : catRevenue.entrySet()) {
            String catId = entry.getKey();
            BigDecimal rev = entry.getValue();
            int units = catUnits.getOrDefault(catId, 0);
            String catName = catMap.containsKey(catId) ? catMap.get(catId).getName() : "General";
            BigDecimal pct = grandTotal.compareTo(BigDecimal.ZERO) > 0
                    ? rev.multiply(BigDecimal.valueOf(100)).divide(grandTotal, 2, RoundingMode.HALF_UP)
                    : BigDecimal.ZERO;

            summaries.add(new ReportDtos.CategorySalesSummary(catId, catName, rev.setScale(2, RoundingMode.HALF_UP), units, pct));
        }

        summaries.sort((a, b) -> b.getTotalRevenue().compareTo(a.getTotalRevenue()));
        return summaries;
    }

    @Transactional(readOnly = true)
    public List<ReportDtos.ProductSalesSummary> getSalesByProduct() {
        Map<String, Product> prodMap = productRepository.findAll().stream()
                .collect(Collectors.toMap(Product::getId, p -> p, (a, b) -> a));

        Map<String, BigDecimal> prodRevenue = new HashMap<>();
        Map<String, Integer> prodUnits = new HashMap<>();
        Map<String, BigDecimal> prodProfit = new HashMap<>();

        for (Sale sale : saleRepository.findAll()) {
            if ("Returned".equalsIgnoreCase(sale.getStatus())) continue;
            for (SaleItem item : sale.getItems()) {
                String pid = item.getProductId();
                prodRevenue.put(pid, prodRevenue.getOrDefault(pid, BigDecimal.ZERO).add(item.getLineTotal()));
                prodUnits.put(pid, prodUnits.getOrDefault(pid, 0) + item.getQuantity());

                BigDecimal lineCost = item.getPurchasePrice().multiply(BigDecimal.valueOf(item.getQuantity()));
                BigDecimal taxable = item.getLineTotal().subtract(item.getTaxAmount());
                BigDecimal profit = taxable.subtract(lineCost);
                prodProfit.put(pid, prodProfit.getOrDefault(pid, BigDecimal.ZERO).add(profit));
            }
        }

        List<ReportDtos.ProductSalesSummary> list = new ArrayList<>();
        for (Map.Entry<String, BigDecimal> entry : prodRevenue.entrySet()) {
            String pid = entry.getKey();
            Product p = prodMap.get(pid);
            String name = p != null ? p.getName() : "Unknown Product";
            String sku = p != null ? p.getSku() : "N/A";
            list.add(new ReportDtos.ProductSalesSummary(
                    pid,
                    name,
                    sku,
                    entry.getValue().setScale(2, RoundingMode.HALF_UP),
                    prodUnits.getOrDefault(pid, 0),
                    prodProfit.getOrDefault(pid, BigDecimal.ZERO).setScale(2, RoundingMode.HALF_UP)
            ));
        }

        list.sort((a, b) -> b.getRevenue().compareTo(a.getRevenue()));
        return list;
    }

    @Transactional(readOnly = true)
    public List<ReportDtos.PaymentMethodSummary> getPaymentMethodSummary() {
        List<Payment> payments = paymentRepository.findAll();
        Map<String, BigDecimal> amounts = new HashMap<>();
        Map<String, Integer> counts = new HashMap<>();
        BigDecimal totalPayments = BigDecimal.ZERO;

        for (Payment p : payments) {
            if ("Sale".equalsIgnoreCase(p.getType())) {
                String method = p.getMethod() != null ? p.getMethod() : "Cash";
                amounts.put(method, amounts.getOrDefault(method, BigDecimal.ZERO).add(p.getAmount()));
                counts.put(method, counts.getOrDefault(method, 0) + 1);
                totalPayments = totalPayments.add(p.getAmount());
            }
        }

        List<ReportDtos.PaymentMethodSummary> summaries = new ArrayList<>();
        for (Map.Entry<String, BigDecimal> e : amounts.entrySet()) {
            BigDecimal amt = e.getValue();
            BigDecimal pct = totalPayments.compareTo(BigDecimal.ZERO) > 0
                    ? amt.multiply(BigDecimal.valueOf(100)).divide(totalPayments, 2, RoundingMode.HALF_UP)
                    : BigDecimal.ZERO;
            summaries.add(new ReportDtos.PaymentMethodSummary(e.getKey(), amt.setScale(2, RoundingMode.HALF_UP), counts.get(e.getKey()), pct));
        }

        return summaries;
    }

    @Transactional(readOnly = true)
    public ReportDtos.PurchaseSupplierSummary getPurchaseSupplierSummary() {
        List<PurchaseOrder> orders = purchaseOrderRepository.findAll();
        int totalOrders = orders.size();
        BigDecimal totalSpend = orders.stream().map(PurchaseOrder::getTotalAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
        int pending = (int) orders.stream().filter(po -> po.getStatus() != PurchaseOrderStatus.RECEIVED && po.getStatus() != PurchaseOrderStatus.CANCELLED).count();
        int received = (int) orders.stream().filter(po -> po.getStatus() == PurchaseOrderStatus.RECEIVED).count();
        int suppliers = (int) supplierRepository.count();

        return new ReportDtos.PurchaseSupplierSummary(totalOrders, totalSpend.setScale(2, RoundingMode.HALF_UP), pending, received, suppliers);
    }

    @Transactional(readOnly = true)
    public ReportDtos.ReturnsSummary getReturnsSummary() {
        List<ReturnRecord> returns = returnRepository.findAll();
        int count = returns.size();
        BigDecimal totalRefund = BigDecimal.ZERO;
        int totalUnits = 0;
        int restocked = 0;
        int damaged = 0;

        for (ReturnRecord r : returns) {
            totalRefund = totalRefund.add(r.getTotalRefund());
            if (r.getItems() != null) {
                for (ReturnItem item : r.getItems()) {
                    totalUnits += item.getQuantity();
                    if ("Sellable".equalsIgnoreCase(item.getItemCondition())) {
                        restocked += item.getQuantity();
                    } else {
                        damaged += item.getQuantity();
                    }
                }
            }
        }

        return new ReportDtos.ReturnsSummary(count, totalRefund.setScale(2, RoundingMode.HALF_UP), totalUnits, restocked, damaged);
    }
}
