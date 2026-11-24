package com.retailflow.common.security;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class JwtTokenProviderTest {

    private JwtTokenProvider tokenProvider;
    private final String secret = "404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970";
    private final long expirationMs = 3600000; // 1 hour

    @BeforeEach
    void setUp() {
        tokenProvider = new JwtTokenProvider(secret, expirationMs);
    }

    @Test
    @DisplayName("Should generate valid JWT token with claims and parse accurately")
    void testGenerateAndValidateToken() {
        String token = tokenProvider.generateToken("user-123", "cashier@retailflow.in", "CASHIER", "Priya Nair");

        assertNotNull(token);
        assertTrue(tokenProvider.validateToken(token));
        assertEquals("cashier@retailflow.in", tokenProvider.getEmailFromToken(token));
        assertEquals("CASHIER", tokenProvider.getRoleFromToken(token));
        assertEquals("user-123", tokenProvider.getUserIdFromToken(token));
    }

    @Test
    @DisplayName("Should reject tampered or invalid JWT signature")
    void testRejectTamperedToken() {
        String token = tokenProvider.generateToken("user-123", "cashier@retailflow.in", "CASHIER", "Priya Nair");
        String tampered = token + "corrupted";

        assertFalse(tokenProvider.validateToken(tampered));
    }

    @Test
    @DisplayName("Should reject expired token")
    void testRejectExpiredToken() {
        JwtTokenProvider shortLivedProvider = new JwtTokenProvider(secret, -1000); // expired 1s ago
        String expiredToken = shortLivedProvider.generateToken("user-123", "cashier@retailflow.in", "CASHIER", "Priya Nair");

        assertFalse(shortLivedProvider.validateToken(expiredToken));
    }
}
