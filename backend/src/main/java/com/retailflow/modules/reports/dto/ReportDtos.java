package com.retailflow.modules.reports.dto;

import java.math.BigDecimal;
import java.util.List;

public class ReportDtos {

    public static class SummaryKpis {
        private BigDecimal totalRevenue;
        private BigDecimal taxableSales;
        private BigDecimal totalGst;
        private BigDecimal grossProfit;
        private int invoiceCount;

        public SummaryKpis(BigDecimal totalRevenue, BigDecimal taxableSales, BigDecimal totalGst, BigDecimal grossProfit, int invoiceCount) {
            this.totalRevenue = totalRevenue;
            this.taxableSales = taxableSales;
            this.totalGst = totalGst;
            this.grossProfit = grossProfit;
            this.invoiceCount = invoiceCount;
        }

        public BigDecimal getTotalRevenue() { return totalRevenue; }
        public BigDecimal getTaxableSales() { return taxableSales; }
        public BigDecimal getTotalGst() { return totalGst; }
        public BigDecimal getGrossProfit() { return grossProfit; }
        public int getInvoiceCount() { return invoiceCount; }
    }

    public static class Gstr1Slab {
        private BigDecimal rate;
        private BigDecimal taxableValue;
        private BigDecimal cgst;
        private BigDecimal sgst;
        private BigDecimal totalTax;

        public Gstr1Slab(BigDecimal rate, BigDecimal taxableValue, BigDecimal cgst, BigDecimal sgst, BigDecimal totalTax) {
            this.rate = rate;
            this.taxableValue = taxableValue;
            this.cgst = cgst;
            this.sgst = sgst;
            this.totalTax = totalTax;
        }

        public BigDecimal getRate() { return rate; }
        public BigDecimal getTaxableValue() { return taxableValue; }
        public BigDecimal getCgst() { return cgst; }
        public BigDecimal getSgst() { return sgst; }
        public BigDecimal getTotalTax() { return totalTax; }
    }

    public static class DailyTrend {
        private String label;
        private BigDecimal revenue;
        private BigDecimal profit;

        public DailyTrend(String label, BigDecimal revenue, BigDecimal profit) {
            this.label = label;
            this.revenue = revenue;
            this.profit = profit;
        }

        public String getLabel() { return label; }
        public BigDecimal getRevenue() { return revenue; }
        public BigDecimal getProfit() { return profit; }
    }

    public static class CategorySalesSummary {
        private String categoryId;
        private String categoryName;
        private BigDecimal totalRevenue;
        private int unitsSold;
        private BigDecimal percentageOfTotal;

        public CategorySalesSummary(String categoryId, String categoryName, BigDecimal totalRevenue, int unitsSold, BigDecimal percentageOfTotal) {
            this.categoryId = categoryId;
            this.categoryName = categoryName;
            this.totalRevenue = totalRevenue;
            this.unitsSold = unitsSold;
            this.percentageOfTotal = percentageOfTotal;
        }

        public String getCategoryId() { return categoryId; }
        public String getCategoryName() { return categoryName; }
        public BigDecimal getTotalRevenue() { return totalRevenue; }
        public int getUnitsSold() { return unitsSold; }
        public BigDecimal getPercentageOfTotal() { return percentageOfTotal; }
    }

    public static class ProductSalesSummary {
        private String productId;
        private String productName;
        private String sku;
        private BigDecimal revenue;
        private int quantitySold;
        private BigDecimal estimatedProfit;

        public ProductSalesSummary(String productId, String productName, String sku, BigDecimal revenue, int quantitySold, BigDecimal estimatedProfit) {
            this.productId = productId;
            this.productName = productName;
            this.sku = sku;
            this.revenue = revenue;
            this.quantitySold = quantitySold;
            this.estimatedProfit = estimatedProfit;
        }

        public String getProductId() { return productId; }
        public String getProductName() { return productName; }
        public String getSku() { return sku; }
        public BigDecimal getRevenue() { return revenue; }
        public int getQuantitySold() { return quantitySold; }
        public BigDecimal getEstimatedProfit() { return estimatedProfit; }
    }

    public static class PaymentMethodSummary {
        private String method; // Cash, UPI, Card
        private BigDecimal totalAmount;
        private int transactionCount;
        private BigDecimal percentageOfRevenue;

        public PaymentMethodSummary(String method, BigDecimal totalAmount, int transactionCount, BigDecimal percentageOfRevenue) {
            this.method = method;
            this.totalAmount = totalAmount;
            this.transactionCount = transactionCount;
            this.percentageOfRevenue = percentageOfRevenue;
        }

        public String getMethod() { return method; }
        public BigDecimal getTotalAmount() { return totalAmount; }
        public int getTransactionCount() { return transactionCount; }
        public BigDecimal getPercentageOfRevenue() { return percentageOfRevenue; }
    }

    public static class PurchaseSupplierSummary {
        private int totalOrders;
        private BigDecimal totalSpend;
        private int pendingOrders;
        private int receivedOrders;
        private int totalSuppliers;

        public PurchaseSupplierSummary(int totalOrders, BigDecimal totalSpend, int pendingOrders, int receivedOrders, int totalSuppliers) {
            this.totalOrders = totalOrders;
            this.totalSpend = totalSpend;
            this.pendingOrders = pendingOrders;
            this.receivedOrders = receivedOrders;
            this.totalSuppliers = totalSuppliers;
        }

        public int getTotalOrders() { return totalOrders; }
        public BigDecimal getTotalSpend() { return totalSpend; }
        public int getPendingOrders() { return pendingOrders; }
        public int getReceivedOrders() { return receivedOrders; }
        public int getTotalSuppliers() { return totalSuppliers; }
    }

    public static class ReturnsSummary {
        private int totalReturnsCount;
        private BigDecimal totalRefundAmount;
        private int totalReturnedUnits;
        private int restockedUnits;
        private int damagedUnits;

        public ReturnsSummary(int totalReturnsCount, BigDecimal totalRefundAmount, int totalReturnedUnits, int restockedUnits, int damagedUnits) {
            this.totalReturnsCount = totalReturnsCount;
            this.totalRefundAmount = totalRefundAmount;
            this.totalReturnedUnits = totalReturnedUnits;
            this.restockedUnits = restockedUnits;
            this.damagedUnits = damagedUnits;
        }

        public int getTotalReturnsCount() { return totalReturnsCount; }
        public BigDecimal getTotalRefundAmount() { return totalRefundAmount; }
        public int getTotalReturnedUnits() { return totalReturnedUnits; }
        public int getRestockedUnits() { return restockedUnits; }
        public int getDamagedUnits() { return damagedUnits; }
    }
}
