package com.retailflow.modules.auth.controller;

import com.retailflow.common.api.ApiResponse;
import com.retailflow.common.security.JwtAuthenticationFilter;
import com.retailflow.common.security.JwtTokenProvider;
import com.retailflow.common.security.TokenBlacklistService;
import com.retailflow.modules.auth.dto.AuthDtos;
import com.retailflow.modules.auth.service.AuthService;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.security.core.Authentication;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;

import java.time.Duration;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final AuthService authService;
    private final TokenBlacklistService tokenBlacklistService;
    private final JwtTokenProvider tokenProvider;

    public AuthController(AuthService authService,
                          TokenBlacklistService tokenBlacklistService,
                          JwtTokenProvider tokenProvider) {
        this.authService = authService;
        this.tokenBlacklistService = tokenBlacklistService;
        this.tokenProvider = tokenProvider;
    }

    @PostMapping("/login")
    public ApiResponse<AuthDtos.AuthResponse> login(
            @Valid @RequestBody AuthDtos.LoginRequest request,
            HttpServletResponse response) {
        AuthDtos.AuthResponse auth = authService.login(request);
        ResponseCookie cookie = ResponseCookie.from(JwtAuthenticationFilter.AUTH_COOKIE_NAME, auth.getAccessToken())
                .httpOnly(true)
                .secure(true)
                .sameSite("None")
                .path("/api/v1")
                .maxAge(Duration.ofSeconds(auth.getExpiresInSeconds()))
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
        return ApiResponse.ok(auth, "Signed in successfully");
    }

    @PostMapping("/logout")
    public ApiResponse<Void> logout(HttpServletRequest request, HttpServletResponse response) {
        String token = extractToken(request);
        if (StringUtils.hasText(token) && tokenProvider.validateToken(token)) {
            tokenBlacklistService.revokeToken(token, tokenProvider.getExpirationFromToken(token).toInstant());
        }
        ResponseCookie cleared = ResponseCookie.from(JwtAuthenticationFilter.AUTH_COOKIE_NAME, "")
                .httpOnly(true)
                .secure(true)
                .sameSite("None")
                .path("/api/v1")
                .maxAge(0)
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, cleared.toString());
        return ApiResponse.ok(null, "Logged out successfully");
    }

    private String extractToken(HttpServletRequest request) {
        String bearer = request.getHeader("Authorization");
        if (StringUtils.hasText(bearer) && bearer.startsWith("Bearer ")) {
            return bearer.substring(7);
        }
        if (request.getCookies() != null) {
            for (Cookie cookie : request.getCookies()) {
                if (JwtAuthenticationFilter.AUTH_COOKIE_NAME.equals(cookie.getName()) && StringUtils.hasText(cookie.getValue())) {
                    return cookie.getValue();
                }
            }
        }
        return null;
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
