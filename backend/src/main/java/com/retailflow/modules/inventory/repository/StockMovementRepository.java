package com.retailflow.modules.inventory.repository;

import com.retailflow.modules.inventory.entity.StockMovement;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface StockMovementRepository extends JpaRepository<StockMovement, String> {
    List<StockMovement> findByProductIdOrderByCreatedAtDesc(String productId);
    List<StockMovement> findAllByOrderByCreatedAtDesc();
}
