package com.retailflow.modules.inventory.service;

import com.retailflow.common.exception.BusinessException;
import com.retailflow.common.exception.ResourceNotFoundException;
import com.retailflow.modules.catalog.entity.Product;
import com.retailflow.modules.catalog.repository.ProductRepository;
import com.retailflow.modules.inventory.dto.InventoryDtos;
import com.retailflow.modules.inventory.entity.StockMovement;
import com.retailflow.modules.inventory.repository.StockMovementRepository;
import com.retailflow.modules.realtime.RealtimeEvent;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class InventoryService {

    private final ProductRepository productRepository;
    private final StockMovementRepository stockMovementRepository;
    private final ApplicationEventPublisher eventPublisher;

    public InventoryService(ProductRepository productRepository,
                            StockMovementRepository stockMovementRepository,
                            ApplicationEventPublisher eventPublisher) {
        this.productRepository = productRepository;
        this.stockMovementRepository = stockMovementRepository;
        this.eventPublisher = eventPublisher;
    }

    @Transactional(readOnly = true)
    public List<InventoryDtos.InventoryRecord> getInventoryRecords(String storeId) {
        List<Product> products;
        if (storeId != null && !storeId.isBlank()) {
            products = productRepository.findByStoreId(storeId);
        } else {
            products = productRepository.findAll();
        }

        return products.stream().map(p -> {
            int stock = p.getStockOnHand() != null ? p.getStockOnHand() : 0;
            int threshold = p.getLowStockThreshold() != null ? p.getLowStockThreshold() : 10;
            BigDecimal cost = p.getPurchasePrice() != null ? p.getPurchasePrice() : BigDecimal.ZERO;
            BigDecimal price = p.getSellingPrice() != null ? p.getSellingPrice() : BigDecimal.ZERO;

            String status = stock == 0 ? "Out of Stock" : (stock <= threshold ? "Low Stock" : "Healthy");

            return new InventoryDtos.InventoryRecord(
                    p.getId(),
                    p.getStoreId(),
                    p.getSku(),
                    p.getBarcode(),
                    p.getName(),
                    p.getLocation(),
                    stock,
                    threshold,
                    cost,
                    price,
                    cost.multiply(BigDecimal.valueOf(stock)).setScale(2, RoundingMode.HALF_UP),
                    price.multiply(BigDecimal.valueOf(stock)).setScale(2, RoundingMode.HALF_UP),
                    status
            );
        }).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public InventoryDtos.InventoryValuationSummary getValuationSummary(String storeId) {
        List<Product> products;
        if (storeId != null && !storeId.isBlank()) {
            products = productRepository.findByStoreId(storeId);
        } else {
            products = productRepository.findAll();
        }

        BigDecimal totalCostValuation = BigDecimal.ZERO;
        BigDecimal totalRetailValuation = BigDecimal.ZERO;
        int totalUnits = 0;
        int lowStock = 0;
        int outOfStock = 0;
        int healthyStock = 0;

        for (Product p : products) {
            int stock = p.getStockOnHand() != null ? p.getStockOnHand() : 0;
            int threshold = p.getLowStockThreshold() != null ? p.getLowStockThreshold() : 10;
            BigDecimal cost = p.getPurchasePrice() != null ? p.getPurchasePrice() : BigDecimal.ZERO;
            BigDecimal price = p.getSellingPrice() != null ? p.getSellingPrice() : BigDecimal.ZERO;

            totalUnits += stock;
            totalCostValuation = totalCostValuation.add(cost.multiply(BigDecimal.valueOf(stock)));
            totalRetailValuation = totalRetailValuation.add(price.multiply(BigDecimal.valueOf(stock)));

            if (stock == 0) {
                outOfStock++;
            } else if (stock <= threshold) {
                lowStock++;
            } else {
                healthyStock++;
            }
        }

        BigDecimal profit = totalRetailValuation.subtract(totalCostValuation);

        return new InventoryDtos.InventoryValuationSummary(
                totalCostValuation.setScale(2, RoundingMode.HALF_UP),
                totalRetailValuation.setScale(2, RoundingMode.HALF_UP),
                profit.setScale(2, RoundingMode.HALF_UP),
                products.size(),
                totalUnits,
                lowStock,
                outOfStock,
                healthyStock
        );
    }

    @Transactional
    public Product adjustStock(InventoryDtos.StockAdjustmentRequest req) {
        Product product = productRepository.findById(req.getProductId())
                .orElseThrow(() -> new ResourceNotFoundException("Product", req.getProductId()));

        int prev = product.getStockOnHand() != null ? product.getStockOnHand() : 0;
        int next = prev + req.getDelta();
        if (next < 0) {
            throw new BusinessException("INSUFFICIENT_STOCK",
                    "Adjustment delta (" + req.getDelta() + ") would result in negative stock (" + next + "). Current stock is " + prev + ".");
        }

        product.setStockOnHand(next);
        productRepository.save(product);

        StockMovement movement = new StockMovement(
                "sm-" + UUID.randomUUID().toString().substring(0, 8),
                product.getId(),
                "Adjustment",
                req.getDelta(),
                prev,
                next,
                "ADJ-" + (System.currentTimeMillis() % 1000000),
                req.getPerformedBy() != null ? req.getPerformedBy() : "Staff",
                product.getLocation(),
                req.getReason()
        );
        stockMovementRepository.save(movement);

        if (eventPublisher != null) {
            eventPublisher.publishEvent(new RealtimeEvent.InventoryChangePayload(
                    product.getId(),
                    product.getSku(),
                    product.getName(),
                    req.getDelta(),
                    prev,
                    next,
                    product.getLowStockThreshold() != null ? product.getLowStockThreshold() : 10,
                    req.getPerformedBy(),
                    req.getReason()
            ));
        }

        return product;
    }

    @Transactional
    public Product transferStock(InventoryDtos.StockTransferRequest req) {
        Product product = productRepository.findById(req.getProductId())
                .orElseThrow(() -> new ResourceNotFoundException("Product", req.getProductId()));

        int stock = product.getStockOnHand() != null ? product.getStockOnHand() : 0;
        if (req.getQuantity() <= 0) {
            throw new BusinessException("INVALID_QUANTITY", "Transfer quantity must be positive");
        }
        if (req.getQuantity() > stock) {
            throw new BusinessException("INSUFFICIENT_STOCK",
                    "Cannot transfer " + req.getQuantity() + " units. Only " + stock + " currently on hand.");
        }

        String fromLocation = product.getLocation();
        product.setLocation(req.getToLocation());
        productRepository.save(product);

        StockMovement movement = new StockMovement(
                "sm-" + UUID.randomUUID().toString().substring(0, 8),
                product.getId(),
                "Transfer",
                0,
                stock,
                stock,
                "TRF-" + (System.currentTimeMillis() % 1000000),
                req.getPerformedBy() != null ? req.getPerformedBy() : "Staff",
                req.getToLocation(),
                "Transferred " + req.getQuantity() + " units from " + fromLocation + " to " + req.getToLocation() +
                        (req.getNote() != null && !req.getNote().isBlank() ? " (" + req.getNote() + ")" : "")
        );
        stockMovementRepository.save(movement);

        return product;
    }

    @Transactional(readOnly = true)
    public List<StockMovement> getStockMovements(String productId) {
        if (productId != null && !productId.isBlank()) {
            return stockMovementRepository.findByProductIdOrderByCreatedAtDesc(productId);
        }
        return stockMovementRepository.findAllByOrderByCreatedAtDesc();
    }
}
