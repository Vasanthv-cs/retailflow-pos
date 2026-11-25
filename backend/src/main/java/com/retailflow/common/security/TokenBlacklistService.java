package com.retailflow.common.security;

import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.Base64;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class TokenBlacklistService {

    private final Map<String, Instant> revokedTokenHashes = new ConcurrentHashMap<>();

    public void revokeToken(String token, Instant expiresAt) {
        if (token == null || token.isBlank()) {
            return;
        }
        Instant expiry = expiresAt != null ? expiresAt : Instant.now().plusSeconds(86400);
        revokedTokenHashes.put(hashToken(token), expiry);
        cleanupExpired();
    }

    public boolean isRevoked(String token) {
        if (token == null || token.isBlank()) {
            return false;
        }
        String hash = hashToken(token);
        Instant expiry = revokedTokenHashes.get(hash);
        if (expiry == null) {
            return false;
        }
        if (expiry.isBefore(Instant.now())) {
            revokedTokenHashes.remove(hash);
            return false;
        }
        return true;
    }

    private void cleanupExpired() {
        Instant now = Instant.now();
        revokedTokenHashes.entrySet().removeIf(entry -> entry.getValue().isBefore(now));
    }

    private String hashToken(String token) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(token.getBytes(StandardCharsets.UTF_8));
            return Base64.getEncoder().encodeToString(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 unavailable", e);
        }
    }
}
