package com.retailflow.modules.catalog.repository;

import com.retailflow.modules.catalog.entity.Product;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProductRepository extends JpaRepository<Product, String> {
    Optional<Product> findBySku(String sku);
    Optional<Product> findByBarcode(String barcode);
    List<Product> findByCategoryId(String categoryId);
    List<Product> findByStoreId(String storeId);
    
    boolean existsBySku(String sku);
    boolean existsByBarcode(String barcode);
    boolean existsBySkuAndIdNot(String sku, String id);
    boolean existsByBarcodeAndIdNot(String barcode, String id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT p FROM Product p WHERE p.id = :id")
    Optional<Product> findByIdForUpdate(@Param("id") String id);

    @Query("SELECT p FROM Product p WHERE " +
           "(:query IS NULL OR :query = '' OR LOWER(p.name) LIKE LOWER(CONCAT('%', :query, '%')) OR LOWER(p.sku) LIKE LOWER(CONCAT('%', :query, '%')) OR p.barcode LIKE CONCAT('%', :query, '%')) " +
           "AND (:categoryId IS NULL OR :categoryId = '' OR :categoryId = 'all' OR p.categoryId = :categoryId) " +
           "AND (:storeId IS NULL OR :storeId = '' OR p.storeId = :storeId)")
    Page<Product> searchAndFilter(
            @Param("query") String query,
            @Param("categoryId") String categoryId,
            @Param("storeId") String storeId,
            Pageable pageable);

    @Query("SELECT p FROM Product p WHERE LOWER(p.name) LIKE LOWER(CONCAT('%', :query, '%')) " +
           "OR LOWER(p.sku) LIKE LOWER(CONCAT('%', :query, '%')) " +
           "OR p.barcode LIKE CONCAT('%', :query, '%')")
    List<Product> searchProducts(@Param("query") String query);

    @Query("SELECT p FROM Product p WHERE p.stockOnHand <= p.lowStockThreshold")
    List<Product> findLowStockProducts();

    @Query("SELECT p FROM Product p WHERE p.storeId = :storeId AND p.stockOnHand <= p.lowStockThreshold")
    List<Product> findLowStockProductsByStore(@Param("storeId") String storeId);
}
