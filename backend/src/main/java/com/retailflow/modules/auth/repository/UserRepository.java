package com.retailflow.modules.auth.repository;

import com.retailflow.modules.auth.entity.RoleName;
import com.retailflow.modules.auth.entity.User;
import com.retailflow.modules.auth.entity.UserStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, String> {
    Optional<User> findByEmail(String email);
    Optional<User> findByEmployeeCode(String employeeCode);
    boolean existsByEmail(String email);
    boolean existsByEmployeeCode(String employeeCode);

    @Query("SELECT u FROM User u WHERE (:query IS NULL OR " +
           "LOWER(u.name) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(u.email) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(u.employeeCode) LIKE LOWER(CONCAT('%', :query, '%'))) AND " +
           "(:role IS NULL OR u.role.name = :role) AND " +
           "(:status IS NULL OR u.status = :status)")
    Page<User> searchUsers(
            @Param("query") String query,
            @Param("role") RoleName role,
            @Param("status") UserStatus status,
            Pageable pageable
    );

    long countByRoleName(RoleName roleName);
}
