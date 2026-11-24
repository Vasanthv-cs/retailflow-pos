package com.retailflow.modules.auth.controller;

import com.retailflow.common.api.ApiResponse;
import com.retailflow.common.api.PageResponse;
import com.retailflow.modules.auth.dto.AuthDtos;
import com.retailflow.modules.auth.entity.RoleName;
import com.retailflow.modules.auth.entity.UserStatus;
import com.retailflow.modules.auth.service.UserService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/users")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ApiResponse<PageResponse<AuthDtos.UserResponseDto>> getUsers(
            @RequestParam(required = false) String query,
            @RequestParam(required = false) RoleName role,
            @RequestParam(required = false) UserStatus status,
            @PageableDefault(size = 20) Pageable pageable) {
        return ApiResponse.ok(userService.getUsers(query, role, status, pageable));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ApiResponse<AuthDtos.UserResponseDto> getUserById(@PathVariable String id) {
        return ApiResponse.ok(userService.getUserById(id));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<AuthDtos.UserResponseDto> createUser(@Valid @RequestBody AuthDtos.CreateUserRequest request) {
        return ApiResponse.created(userService.createUser(request), "Staff user created successfully");
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<AuthDtos.UserResponseDto> updateUser(
            @PathVariable String id,
            @Valid @RequestBody AuthDtos.UpdateUserRequest request) {
        return ApiResponse.ok(userService.updateUser(id, request), "Staff user updated successfully");
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<AuthDtos.UserResponseDto> updateStatus(
            @PathVariable String id,
            @Valid @RequestBody AuthDtos.UpdateStatusRequest request) {
        return ApiResponse.ok(userService.updateUserStatus(id, request.getStatus()), "User status updated to " + request.getStatus());
    }

    @PostMapping("/{id}/reset-password")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<Void> resetPassword(
            @PathVariable String id,
            @Valid @RequestBody AuthDtos.ResetPasswordRequest request) {
        userService.resetPassword(id, request.getTemporaryPassword());
        return ApiResponse.ok(null, "Password reset successfully");
    }
}
