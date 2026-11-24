package com.retailflow.modules.auth.service;

import com.retailflow.common.exception.BusinessException;
import com.retailflow.common.security.JwtTokenProvider;
import com.retailflow.modules.auth.dto.AuthDtos;
import com.retailflow.modules.auth.entity.Role;
import com.retailflow.modules.auth.entity.RoleName;
import com.retailflow.modules.auth.entity.User;
import com.retailflow.modules.auth.entity.UserStatus;
import com.retailflow.modules.auth.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtTokenProvider tokenProvider;

    private AuthService authService;

    private User sampleUser;
    private Role cashierRole;

    @BeforeEach
    void setUp() {
        authService = new AuthService(userRepository, passwordEncoder, tokenProvider);

        cashierRole = new Role("role-3", RoleName.CASHIER, "Billing cashier");
        sampleUser = new User();
        sampleUser.setId("emp-2");
        sampleUser.setName("Priya Nair");
        sampleUser.setEmail("priya@annapurnamart.in");
        sampleUser.setEmployeeCode("RF-102");
        sampleUser.setPasswordHash("$2a$12$hashedPassword");
        sampleUser.setRole(cashierRole);
        sampleUser.setStatus(UserStatus.ACTIVE);
    }

    @Test
    @DisplayName("Should successfully authenticate valid credentials and issue JWT")
    void testLoginSuccess() {
        AuthDtos.LoginRequest req = new AuthDtos.LoginRequest("priya@annapurnamart.in", "correctPassword");

        when(userRepository.findByEmail("priya@annapurnamart.in")).thenReturn(Optional.of(sampleUser));
        when(passwordEncoder.matches("correctPassword", "$2a$12$hashedPassword")).thenReturn(true);
        when(tokenProvider.generateToken("emp-2", "priya@annapurnamart.in", "CASHIER", "Priya Nair"))
                .thenReturn("mocked.jwt.token");

        AuthDtos.AuthResponse response = authService.login(req);

        assertNotNull(response);
        assertEquals("mocked.jwt.token", response.getToken());
        assertEquals("CASHIER", response.getRole());
        assertEquals("emp-2", response.getUserId());
        assertEquals(0, sampleUser.getFailedLoginAttempts());
        assertNotNull(sampleUser.getLastLoginAt());
        verify(userRepository).save(sampleUser);
    }

    @Test
    @DisplayName("Should reject invalid password and increment failed attempts")
    void testLoginBadPassword() {
        AuthDtos.LoginRequest req = new AuthDtos.LoginRequest("priya@annapurnamart.in", "wrongPassword");

        when(userRepository.findByEmail("priya@annapurnamart.in")).thenReturn(Optional.of(sampleUser));
        when(passwordEncoder.matches("wrongPassword", "$2a$12$hashedPassword")).thenReturn(false);

        BusinessException ex = assertThrows(BusinessException.class, () -> authService.login(req));
        assertEquals("INVALID_CREDENTIALS", ex.getCode());
        assertEquals(1, sampleUser.getFailedLoginAttempts());
        verify(userRepository).save(sampleUser);
    }

    @Test
    @DisplayName("Should suspend account after consecutive failed login attempts")
    void testAccountLockout() {
        sampleUser.setFailedLoginAttempts(4);
        AuthDtos.LoginRequest req = new AuthDtos.LoginRequest("priya@annapurnamart.in", "wrongPassword");

        when(userRepository.findByEmail("priya@annapurnamart.in")).thenReturn(Optional.of(sampleUser));
        when(passwordEncoder.matches("wrongPassword", "$2a$12$hashedPassword")).thenReturn(false);

        BusinessException ex = assertThrows(BusinessException.class, () -> authService.login(req));
        assertEquals("ACCOUNT_SUSPENDED", ex.getCode());
        assertEquals(UserStatus.SUSPENDED, sampleUser.getStatus());
        verify(userRepository).save(sampleUser);
    }

    @Test
    @DisplayName("Should block login for inactive staff accounts")
    void testLoginInactiveAccount() {
        sampleUser.setStatus(UserStatus.INACTIVE);
        AuthDtos.LoginRequest req = new AuthDtos.LoginRequest("priya@annapurnamart.in", "anyPassword");

        when(userRepository.findByEmail("priya@annapurnamart.in")).thenReturn(Optional.of(sampleUser));

        BusinessException ex = assertThrows(BusinessException.class, () -> authService.login(req));
        assertEquals("ACCOUNT_INACTIVE", ex.getCode());
    }
}
