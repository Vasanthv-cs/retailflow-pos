package com.retailflow.modules.auth.service;

import com.retailflow.common.api.PageResponse;
import com.retailflow.common.exception.BusinessException;
import com.retailflow.common.exception.ResourceNotFoundException;
import com.retailflow.common.security.SecurityUtils;
import com.retailflow.modules.auth.dto.AuthDtos;
import com.retailflow.modules.auth.entity.Role;
import com.retailflow.modules.auth.entity.RoleName;
import com.retailflow.modules.auth.entity.User;
import com.retailflow.modules.auth.entity.UserStatus;
import com.retailflow.modules.auth.repository.RoleRepository;
import com.retailflow.modules.auth.repository.UserRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;

    public UserService(UserRepository userRepository,
                       RoleRepository roleRepository,
                       PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional(readOnly = true)
    public List<AuthDtos.UserResponseDto> getAllEmployees() {
        return userRepository.findAll().stream()
                .filter(u -> SecurityUtils.matchesCurrentStore(u.getStoreId()))
                .map(AuthDtos.UserResponseDto::fromEntity)
                .toList();
    }

    @Transactional(readOnly = true)
    public PageResponse<AuthDtos.UserResponseDto> getUsers(String query, RoleName role, UserStatus status, Pageable pageable) {
        Page<User> page = userRepository.searchUsers(
                (query != null && !query.isBlank()) ? query.trim() : null,
                role,
                status,
                pageable
        );
        List<AuthDtos.UserResponseDto> filtered = page.getContent().stream()
                .filter(u -> SecurityUtils.matchesCurrentStore(u.getStoreId()))
                .map(AuthDtos.UserResponseDto::fromEntity)
                .toList();
        return PageResponse.of(filtered, page.getNumber(), page.getSize(), page.getTotalElements());
    }

    @Transactional(readOnly = true)
    public AuthDtos.UserResponseDto getUserById(String id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User", id));
        SecurityUtils.assertStoreAccess(user.getStoreId());
        return AuthDtos.UserResponseDto.fromEntity(user);
    }

    @Transactional
    public AuthDtos.UserResponseDto createUser(AuthDtos.CreateUserRequest req) {
        if (userRepository.existsByEmail(req.getEmail().trim().toLowerCase())) {
            throw new BusinessException("DUPLICATE_EMAIL", "Email is already registered: " + req.getEmail());
        }
        if (userRepository.existsByEmployeeCode(req.getEmployeeCode().trim())) {
            throw new BusinessException("DUPLICATE_EMPLOYEE_CODE", "Employee code already assigned: " + req.getEmployeeCode());
        }

        Role role = roleRepository.findByName(req.getRole())
                .orElseThrow(() -> new ResourceNotFoundException("Role", req.getRole().name()));

        User user = new User();
        user.setId("emp-" + UUID.randomUUID().toString().substring(0, 8));
        user.setStoreId(SecurityUtils.resolveStoreId(null));
        user.setName(req.getName().trim());
        user.setEmail(req.getEmail().trim().toLowerCase());
        user.setEmployeeCode(req.getEmployeeCode().trim().toUpperCase());
        user.setPasswordHash(passwordEncoder.encode(req.getPassword()));
        user.setPhone(req.getPhone().trim());
        user.setRole(role);
        user.setShift(req.getShift());
        user.setStatus(UserStatus.ACTIVE);
        user.setJoinedDate(LocalDate.now());

        User saved = userRepository.save(user);
        return AuthDtos.UserResponseDto.fromEntity(saved);
    }

    @Transactional
    public AuthDtos.UserResponseDto updateUser(String id, AuthDtos.UpdateUserRequest req) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User", id));
        SecurityUtils.assertStoreAccess(user.getStoreId());

        Role role = roleRepository.findByName(req.getRole())
                .orElseThrow(() -> new ResourceNotFoundException("Role", req.getRole().name()));

        user.setName(req.getName().trim());
        user.setPhone(req.getPhone().trim());
        user.setRole(role);
        if (req.getShift() != null) {
            user.setShift(req.getShift());
        }

        User saved = userRepository.save(user);
        return AuthDtos.UserResponseDto.fromEntity(saved);
    }

    @Transactional
    public AuthDtos.UserResponseDto updateUserStatus(String id, UserStatus newStatus) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User", id));
        SecurityUtils.assertStoreAccess(user.getStoreId());

        // Prevent deactivating the last active administrator
        if (user.getRole().getName() == RoleName.ADMIN && newStatus != UserStatus.ACTIVE) {
            long activeAdmins = userRepository.findAll().stream()
                    .filter(u -> u.getRole().getName() == RoleName.ADMIN && u.getStatus() == UserStatus.ACTIVE)
                    .count();
            if (activeAdmins <= 1) {
                throw new BusinessException("CANNOT_DEACTIVATE_LAST_ADMIN", "Cannot deactivate or suspend the sole active administrator account");
            }
        }

        user.setStatus(newStatus);
        if (newStatus == UserStatus.ACTIVE) {
            user.setFailedLoginAttempts(0); // unlock if previously locked
        }

        User saved = userRepository.save(user);
        return AuthDtos.UserResponseDto.fromEntity(saved);
    }

    @Transactional
    public void resetPassword(String id, String temporaryPassword) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User", id));
        SecurityUtils.assertStoreAccess(user.getStoreId());

        user.setPasswordHash(passwordEncoder.encode(temporaryPassword));
        user.setFailedLoginAttempts(0);
        user.setStatus(UserStatus.ACTIVE);
        userRepository.save(user);
    }
}
