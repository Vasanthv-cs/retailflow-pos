package com.retailflow.modules.purchases.service;

import com.retailflow.common.exception.BusinessException;
import com.retailflow.common.exception.ResourceNotFoundException;
import com.retailflow.modules.catalog.entity.Product;
import com.retailflow.modules.catalog.repository.ProductRepository;
import com.retailflow.modules.inventory.entity.StockMovement;
import com.retailflow.modules.inventory.repository.StockMovementRepository;
import com.retailflow.modules.purchases.dto.PurchaseDtos;
import com.retailflow.modules.purchases.entity.PurchaseOrder;
import com.retailflow.modules.purchases.entity.PurchaseOrderItem;
import com.retailflow.modules.purchases.entity.PurchaseOrderStatus;
import com.retailflow.modules.purchases.entity.Supplier;
import com.retailflow.modules.purchases.repository.PurchaseOrderRepository;
import com.retailflow.modules.purchases.repository.SupplierRepository;
import com.retailflow.modules.realtime.RealtimeEvent;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class PurchaseService {

    private final SupplierRepository supplierRepository;
    private final PurchaseOrderRepository purchaseOrderRepository;
    private final ProductRepository productRepository;
    private final StockMovementRepository stockMovementRepository;
    private final ApplicationEventPublisher eventPublisher;

    public PurchaseService(SupplierRepository supplierRepository,
                           PurchaseOrderRepository purchaseOrderRepository,
                           ProductRepository productRepository,
                           StockMovementRepository stockMovementRepository,
                           ApplicationEventPublisher eventPublisher) {
        this.supplierRepository = supplierRepository;
        this.purchaseOrderRepository = purchaseOrderRepository;
        this.productRepository = productRepository;
        this.stockMovementRepository = stockMovementRepository;
        this.eventPublisher = eventPublisher;
    }

    // ==========================================
    // Supplier Management
    // ==========================================

    @Transactional(readOnly = true)
    public List<Supplier> getAllSuppliers(String query) {
        List<Supplier> all = supplierRepository.findAll();
        if (query == null || query.isBlank()) {
            return all;
        }
        String q = query.trim().toLowerCase();
        return all.stream()
                .filter(s -> s.getName().toLowerCase().contains(q)
                        || s.getContactPerson().toLowerCase().contains(q)
                        || s.getGstin().toLowerCase().contains(q)
                        || s.getCity().toLowerCase().contains(q))
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public Supplier getSupplierById(String id) {
        return supplierRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Supplier", id));
    }

    @Transactional
    public Supplier createSupplier(Supplier supplier) {
        if (supplierRepository.existsByGstin(supplier.getGstin().trim())) {
            throw new BusinessException("DUPLICATE_GSTIN", "Supplier with GSTIN " + supplier.getGstin() + " already exists");
        }
        if (supplier.getId() == null || supplier.getId().isBlank()) {
            supplier.setId("sup-" + UUID.randomUUID().toString().substring(0, 8));
        }
        supplier.setGstin(supplier.getGstin().trim().toUpperCase());
        return supplierRepository.save(supplier);
    }

    @Transactional
    public Supplier updateSupplier(String id, Supplier updates) {
        Supplier supplier = getSupplierById(id);
        supplier.setName(updates.getName());
        supplier.setContactPerson(updates.getContactPerson());
        supplier.setPhone(updates.getPhone());
        supplier.setEmail(updates.getEmail());
        supplier.setGstin(updates.getGstin().trim().toUpperCase());
        supplier.setCity(updates.getCity());
        supplier.setAddress(updates.getAddress());
        supplier.setPaymentTerms(updates.getPaymentTerms());
        return supplierRepository.save(supplier);
    }

    // ==========================================
    // Purchase Orders & Receiving
    // ==========================================

    @Transactional(readOnly = true)
    public List<PurchaseDtos.PurchaseOrderDto> getAllPurchaseOrders(String status) {
        List<PurchaseOrder> pos;
        if (status != null && !status.isBlank() && !"all".equalsIgnoreCase(status)) {
            PurchaseOrderStatus st = PurchaseOrderStatus.fromString(status);
            pos = purchaseOrderRepository.findByStatusOrderByOrderDateDesc(st);
        } else {
            pos = purchaseOrderRepository.findAllByOrderByOrderDateDesc();
        }

        Map<String, String> supplierNameMap = supplierRepository.findAll().stream()
                .collect(Collectors.toMap(Supplier::getId, Supplier::getName, (a, b) -> a));

        return pos.stream()
                .map(po -> PurchaseDtos.PurchaseOrderDto.fromEntity(po, supplierNameMap.getOrDefault(po.getSupplierId(), "Unknown Supplier")))
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<PurchaseDtos.PurchaseOrderDto> getPurchaseOrdersBySupplier(String supplierId) {
        Supplier supplier = getSupplierById(supplierId);
        List<PurchaseOrder> pos = purchaseOrderRepository.findBySupplierIdOrderByOrderDateDesc(supplierId);
        return pos.stream()
                .map(po -> PurchaseDtos.PurchaseOrderDto.fromEntity(po, supplier.getName()))
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public PurchaseDtos.PurchaseOrderDto getPurchaseOrderById(String id) {
        PurchaseOrder po = purchaseOrderRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("PurchaseOrder", id));
        String supplierName = supplierRepository.findById(po.getSupplierId())
                .map(Supplier::getName)
                .orElse("Unknown Supplier");
        return PurchaseDtos.PurchaseOrderDto.fromEntity(po, supplierName);
    }

    /**
     * Creates a new purchase order.
     * IMPORTANT: Inventory is NOT modified at creation time.
     */
    @Transactional
    public PurchaseDtos.PurchaseOrderDto createPurchaseOrder(PurchaseDtos.CreatePurchaseOrderRequest req) {
        Supplier supplier = getSupplierById(req.getSupplierId());

        PurchaseOrder po = new PurchaseOrder();
        po.setId("po-" + UUID.randomUUID().toString().substring(0, 8));
        po.setStoreId("store-1");
        po.setSupplierId(supplier.getId());
        po.setPoNumber("PO-" + (1000 + (System.currentTimeMillis() % 90000)));
        po.setOrderDate(LocalDate.now());
        po.setExpectedDate(req.getExpectedDate());
        po.setStatus(req.getStatus() != null ? req.getStatus() : PurchaseOrderStatus.ORDERED);
        po.setNotes(req.getNotes());

        BigDecimal totalAmount = BigDecimal.ZERO;
        List<PurchaseOrderItem> items = new ArrayList<>();

        for (PurchaseDtos.CreateOrderItemRequest itemReq : req.getItems()) {
            Product product = productRepository.findById(itemReq.getProductId())
                    .orElseThrow(() -> new ResourceNotFoundException("Product", itemReq.getProductId()));

            PurchaseOrderItem item = new PurchaseOrderItem();
            item.setId("poi-" + UUID.randomUUID().toString().substring(0, 8));
            item.setPurchaseOrder(po);
            item.setProductId(product.getId());
            item.setQuantity(itemReq.getQuantity());
            item.setReceivedQuantity(0);
            item.setUnitCost(itemReq.getUnitCost());
            item.setGstRate(itemReq.getGstRate());

            BigDecimal lineGross = itemReq.getUnitCost().multiply(BigDecimal.valueOf(itemReq.getQuantity()));
            BigDecimal lineTax = lineGross.multiply(itemReq.getGstRate()).divide(BigDecimal.valueOf(100), 2, java.math.RoundingMode.HALF_UP);
            BigDecimal lineTotal = lineGross.add(lineTax);

            item.setTotalCost(lineTotal);
            totalAmount = totalAmount.add(lineTotal);
            items.add(item);
        }

        po.setTotalAmount(totalAmount);
        po.setItems(items);

        PurchaseOrder saved = purchaseOrderRepository.save(po);
        return PurchaseDtos.PurchaseOrderDto.fromEntity(saved, supplier.getName());
    }

    /**
     * Receives goods against a purchase order (partial or complete).
     * Atomically increases inventory, creates stock movement ledger entries, and records receiving user.
     */
    @Transactional
    public PurchaseDtos.PurchaseOrderDto receiveGoods(String poId, PurchaseDtos.ReceiveGoodsRequest req) {
        PurchaseOrder po = purchaseOrderRepository.findById(poId)
                .orElseThrow(() -> new ResourceNotFoundException("PurchaseOrder", poId));

        if (po.getStatus() == PurchaseOrderStatus.RECEIVED) {
            throw new BusinessException("ALREADY_RECEIVED", "Purchase order " + po.getPoNumber() + " is already completely received");
        }
        if (po.getStatus() == PurchaseOrderStatus.CANCELLED) {
            throw new BusinessException("ORDER_CANCELLED", "Cannot receive goods for cancelled purchase order " + po.getPoNumber());
        }

        po.setReceivedDate(LocalDate.now());
        po.setReceivedBy(req.getReceivedBy() != null ? req.getReceivedBy() : "Staff");

        // Map requested receipts: if null/empty, defaults to receiving all remaining balance
        Map<String, Integer> receiveMap = new HashMap<>();
        if (req.getItems() != null && !req.getItems().isEmpty()) {
            for (PurchaseDtos.ReceiveItemRequest rItem : req.getItems()) {
                receiveMap.put(rItem.getProductId(), rItem.getQuantityReceived());
            }
        } else {
            // Full receiving
            for (PurchaseOrderItem item : po.getItems()) {
                int remaining = item.getQuantity() - item.getReceivedQuantity();
                receiveMap.put(item.getProductId(), remaining);
            }
        }

        boolean anyReceivedNow = false;

        for (PurchaseOrderItem item : po.getItems()) {
            Integer toReceive = receiveMap.get(item.getProductId());
            if (toReceive != null && toReceive > 0) {
                int remaining = item.getQuantity() - item.getReceivedQuantity();
                if (toReceive > remaining) {
                    throw new BusinessException("EXCEEDS_ORDERED_QUANTITY",
                            "Cannot receive " + toReceive + " units for product " + item.getProductId() + ". Remaining balance: " + remaining);
                }

                // Update item received quantity
                item.setReceivedQuantity(item.getReceivedQuantity() + toReceive);
                anyReceivedNow = true;

                // Increase product stockOnHand
                Product product = productRepository.findById(item.getProductId())
                        .orElseThrow(() -> new ResourceNotFoundException("Product", item.getProductId()));
                int prevStock = product.getStockOnHand() != null ? product.getStockOnHand() : 0;
                int newStock = prevStock + toReceive;
                product.setStockOnHand(newStock);
                productRepository.save(product);

                // Create immutable stock movement ledger entry
                StockMovement movement = new StockMovement(
                        "sm-" + UUID.randomUUID().toString().substring(0, 8),
                        product.getId(),
                        "PURCHASE",
                        toReceive,
                        prevStock,
                        newStock,
                        po.getPoNumber(),
                        po.getReceivedBy(),
                        product.getLocation(),
                        "Goods inward received against " + po.getPoNumber() + " (" + toReceive + " units)"
                );
                stockMovementRepository.save(movement);
            }
        }

        if (!anyReceivedNow) {
            throw new BusinessException("NO_GOODS_SPECIFIED", "No valid quantities specified for receipt");
        }

        // Determine final status
        boolean allComplete = po.getItems().stream()
                .allMatch(item -> item.getReceivedQuantity() >= item.getQuantity());
        po.setStatus(allComplete ? PurchaseOrderStatus.RECEIVED : PurchaseOrderStatus.PARTIALLY_RECEIVED);

        PurchaseOrder saved = purchaseOrderRepository.save(po);
        String supplierName = supplierRepository.findById(po.getSupplierId())
                .map(Supplier::getName)
                .orElse("Unknown Supplier");

        if (eventPublisher != null) {
            eventPublisher.publishEvent(new RealtimeEvent.PurchaseOrderUpdatePayload(
                    saved.getId(),
                    saved.getPoNumber(),
                    supplierName,
                    saved.getStatus().name(),
                    saved.getReceivedBy(),
                    saved.getTotalAmount()
            ));
        }

        return PurchaseDtos.PurchaseOrderDto.fromEntity(saved, supplierName);
    }

    @Transactional
    public PurchaseDtos.PurchaseOrderDto cancelPurchaseOrder(String id) {
        PurchaseOrder po = purchaseOrderRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("PurchaseOrder", id));

        if (po.getStatus() == PurchaseOrderStatus.RECEIVED) {
            throw new BusinessException("CANNOT_CANCEL", "Cannot cancel an order that has already been completely received.");
        }
        if (po.getStatus() == PurchaseOrderStatus.CANCELLED) {
            throw new BusinessException("ALREADY_CANCELLED", "Order " + po.getPoNumber() + " is already cancelled.");
        }

        po.setStatus(PurchaseOrderStatus.CANCELLED);
        PurchaseOrder saved = purchaseOrderRepository.save(po);

        String supplierName = supplierRepository.findById(po.getSupplierId())
                .map(Supplier::getName)
                .orElse("Unknown Supplier");

        return PurchaseDtos.PurchaseOrderDto.fromEntity(saved, supplierName);
    }
}
