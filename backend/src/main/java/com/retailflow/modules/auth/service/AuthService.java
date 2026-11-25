package com.retailflow.modules.auth.service;

import com.retailflow.common.exception.BusinessException;
import com.retailflow.common.exception.ResourceNotFoundException;
import com.retailflow.common.security.JwtTokenProvider;
import com.retailflow.modules.auth.dto.AuthDtos;
import com.retailflow.modules.auth.entity.User;
import com.retailflow.modules.auth.entity.UserStatus;
import com.retailflow.modules.auth.repository.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider tokenProvider;

    private static final int MAX_FAILED_ATTEMPTS = 5;
    private static final int RATE_LIMIT_MAX_ATTEMPTS = 10;
    private static final long RATE_LIMIT_WINDOW_MS = 60_000L;
    private final Map<String, Deque<Long>> loginAttemptWindows = new ConcurrentHashMap<>();

    public AuthService(UserRepository userRepository,
                       PasswordEncoder passwordEncoder,
                       JwtTokenProvider tokenProvider) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.tokenProvider = tokenProvider;
    }

    private void checkRateLimit(String key) {
        long now = System.currentTimeMillis();
        Deque<Long> timestamps = loginAttemptWindows.computeIfAbsent(key, k -> new ArrayDeque<>());
        synchronized (timestamps) {
            while (!timestamps.isEmpty() && now - timestamps.peekFirst() > RATE_LIMIT_WINDOW_MS) {
                timestamps.pollFirst();
            }
            if (timestamps.size() >= RATE_LIMIT_MAX_ATTEMPTS) {
                throw new BusinessException("RATE_LIMITED", "Too many login attempts. Please wait 1 minute before retrying.");
            }
            timestamps.addLast(now);
        }
    }

    @Transactional
    public AuthDtos.AuthResponse login(AuthDtos.LoginRequest request) {
        String identifier = request.getEmail().trim().toLowerCase();
        checkRateLimit(identifier);

        User user = userRepository.findByEmail(identifier)
                .or(() -> userRepository.findByEmployeeCode(request.getEmail().trim()))
                .orElseThrow(() -> new BusinessException("INVALID_CREDENTIALS", "Invalid email/employee code or password"));

        // 1. Account status checks
        if (user.getStatus() == UserStatus.SUSPENDED) {
            throw new BusinessException("ACCOUNT_SUSPENDED", "Account is locked due to too many failed login attempts. Contact an administrator.");
        }
        if (user.getStatus() == UserStatus.INACTIVE) {
            throw new BusinessException("ACCOUNT_INACTIVE", "Staff account is deactivated. Contact store management.");
        }

        // 2. Password verification (strict BCrypt only)
        boolean matches = passwordEncoder.matches(request.getPassword(), user.getPasswordHash());

        if (!matches) {
            int failed = user.getFailedLoginAttempts() + 1;
            user.setFailedLoginAttempts(failed);
            if (failed >= MAX_FAILED_ATTEMPTS) {
                user.setStatus(UserStatus.SUSPENDED);
            }
            userRepository.save(user);

            if (user.getStatus() == UserStatus.SUSPENDED) {
                throw new BusinessException("ACCOUNT_SUSPENDED", "Account has been suspended after 5 failed login attempts");
            }
            throw new BusinessException("INVALID_CREDENTIALS", "Invalid email/employee code or password");
        }

        // 3. Reset failed attempts & record login timestamp
        user.setFailedLoginAttempts(0);
        user.setLastLoginAt(Instant.now());
        userRepository.save(user);

        // 4. Generate JWT
        String roleStr = user.getRole() != null ? user.getRole().getName().name() : "CASHIER";
        String token = tokenProvider.generateToken(user.getId(), user.getEmail(), roleStr, user.getName());

        return new AuthDtos.AuthResponse(
                token,
                user.getId(),
                user.getName(),
                user.getEmail(),
                roleStr,
                user.getEmployeeCode(),
                user.getStoreId()
        );
    }

    @Transactional(readOnly = true)
    public AuthDtos.UserResponseDto getCurrentUser(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User", email));
        return AuthDtos.UserResponseDto.fromEntity(user);
    }

    @Transactional
    public void changePassword(String email, AuthDtos.ChangePasswordRequest request) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User", email));

        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPasswordHash())) {
            throw new BusinessException("INVALID_PASSWORD", "Current password does not match");
        }

        if (passwordEncoder.matches(request.getNewPassword(), user.getPasswordHash())) {
            throw new BusinessException("SAME_PASSWORD", "New password cannot be identical to the current password");
        }

        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);
    }
}
