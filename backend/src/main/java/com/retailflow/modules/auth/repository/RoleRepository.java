package com.retailflow.modules.auth.repository;

import com.retailflow.modules.auth.entity.Role;
import com.retailflow.modules.auth.entity.RoleName;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface RoleRepository extends JpaRepository<Role, String> {
    Optional<Role> findByName(RoleName name);
    boolean existsByName(RoleName name);
}
