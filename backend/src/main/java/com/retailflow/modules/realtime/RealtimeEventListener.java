package com.retailflow.modules.realtime;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Component
public class RealtimeEventListener {

    private static final Logger log = LoggerFactory.getLogger(RealtimeEventListener.class);
    private final RealtimeEmitterManager emitterManager;

    public RealtimeEventListener(RealtimeEmitterManager emitterManager) {
        this.emitterManager = emitterManager;
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onInventoryChanged(RealtimeEvent.InventoryChangePayload payload) {
        log.debug("Publishing real-time INVENTORY_UPDATE for product: {}", payload.getSku());
        emitterManager.broadcastToStore("store-1", "INVENTORY_UPDATE", payload);

        if (payload.isLowStock()) {
            RealtimeEvent.LowStockAlertPayload alert = new RealtimeEvent.LowStockAlertPayload(
                    payload.getProductId(),
                    payload.getSku(),
                    payload.getProductName(),
                    payload.getNewStockOnHand(),
                    payload.getLowStockThreshold(),
                    "Store Floor"
            );
            emitterManager.broadcastToStore("store-1", "LOW_STOCK_ALERT", alert);
        }
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onNewSale(RealtimeEvent.NewSalePayload payload) {
        log.debug("Publishing real-time NEW_SALE for invoice: {}", payload.getInvoiceNumber());
        emitterManager.broadcastToStore("store-1", "NEW_SALE", payload);
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onPurchaseOrderUpdated(RealtimeEvent.PurchaseOrderUpdatePayload payload) {
        log.debug("Publishing real-time PURCHASE_ORDER_UPDATE for PO: {}", payload.getPoNumber());
        emitterManager.broadcastToStore("store-1", "PURCHASE_ORDER_UPDATE", payload);
    }
}
