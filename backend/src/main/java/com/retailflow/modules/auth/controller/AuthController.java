package com.retailflow.modules.auth.controller;

import com.retailflow.common.api.ApiResponse;
import com.retailflow.modules.auth.dto.AuthDtos;
import com.retailflow.modules.auth.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/login")
    public ApiResponse<AuthDtos.AuthResponse> login(@Valid @RequestBody AuthDtos.LoginRequest request) {
        return ApiResponse.ok(authService.login(request), "Signed in successfully");
    }

    @PostMapping("/logout")
    public ApiResponse<Void> logout() {
        // Stateless JWT: client discards token from storage
        return ApiResponse.ok(null, "Logged out successfully");
    }

    @GetMapping("/me")
    public ApiResponse<AuthDtos.UserResponseDto> getCurrentUser(Authentication authentication) {
        String email = authentication.getName();
        return ApiResponse.ok(authService.getCurrentUser(email));
    }

    @PostMapping("/change-password")
    public ApiResponse<Void> changePassword(
            Authentication authentication,
            @Valid @RequestBody AuthDtos.ChangePasswordRequest request) {
        authService.changePassword(authentication.getName(), request);
        return ApiResponse.ok(null, "Password updated successfully");
    }
}
