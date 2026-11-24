package com.retailflow.modules.store.service;

import com.retailflow.common.exception.ResourceNotFoundException;
import com.retailflow.modules.store.entity.Store;
import com.retailflow.modules.store.repository.StoreRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class StoreService {

    private final StoreRepository storeRepository;

    public StoreService(StoreRepository storeRepository) {
        this.storeRepository = storeRepository;
    }

    @Transactional(readOnly = true)
    public Store getStoreSettings(String storeId) {
        return storeRepository.findById(storeId)
                .orElseGet(() -> storeRepository.findAll().stream().findFirst()
                        .orElseThrow(() -> new ResourceNotFoundException("Store", storeId)));
    }

    @Transactional
    public Store updateStoreSettings(String storeId, Store updates) {
        Store store = getStoreSettings(storeId);
        store.setName(updates.getName());
        store.setLegalName(updates.getLegalName());
        store.setGstin(updates.getGstin());
        store.setPhone(updates.getPhone());
        store.setEmail(updates.getEmail());
        store.setAddress(updates.getAddress());
        store.setCity(updates.getCity());
        store.setState(updates.getState());
        store.setPincode(updates.getPincode());
        store.setReceiptFooter(updates.getReceiptFooter());
        store.setDefaultLowStockThreshold(updates.getDefaultLowStockThreshold());
        store.setTaxInclusivePricing(updates.getTaxInclusivePricing());
        return storeRepository.save(store);
    }
}
