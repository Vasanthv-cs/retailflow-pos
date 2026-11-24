package com.retailflow.modules.catalog.repository;

import com.retailflow.modules.catalog.entity.Category;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface CategoryRepository extends JpaRepository<Category, String> {
    Optional<Category> findByName(String name);
    boolean existsByName(String name);
}
