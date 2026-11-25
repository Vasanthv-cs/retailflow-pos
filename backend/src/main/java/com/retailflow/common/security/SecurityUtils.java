package com.retailflow.common.security;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.Objects;
import java.util.Optional;

public final class SecurityUtils {

    private SecurityUtils() {
    }

    public static Optional<UserPrincipal> getCurrentPrincipal() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated() && auth.getPrincipal() instanceof UserPrincipal principal) {
            return Optional.of(principal);
        }
        return Optional.empty();
    }

    /**
     * Resolves the effective storeId for the current request.
     * If a UserPrincipal is authenticated, rejects attempts to access a different storeId.
     */
    public static String resolveStoreId(String requestedStoreId) {
        Optional<UserPrincipal> principalOpt = getCurrentPrincipal();
        if (principalOpt.isEmpty()) {
            return (requestedStoreId != null && !requestedStoreId.isBlank()) ? requestedStoreId.trim() : "store-1";
        }
        String assignedStoreId = principalOpt.get().getStoreId();
        if (assignedStoreId == null || assignedStoreId.isBlank()) {
            throw new AccessDeniedException("User account is not assigned to any store");
        }
        if (requestedStoreId != null && !requestedStoreId.isBlank()
                && !assignedStoreId.equals(requestedStoreId.trim())) {
            throw new AccessDeniedException("Cross-store access denied");
        }
        return assignedStoreId;
    }

    /**
     * Verifies that a resource belongs to the authenticated user's assigned store.
     */
    public static void assertStoreAccess(String resourceStoreId) {
        Optional<UserPrincipal> principalOpt = getCurrentPrincipal();
        if (principalOpt.isEmpty()) {
            return;
        }
        String assignedStoreId = principalOpt.get().getStoreId();
        if (assignedStoreId == null || assignedStoreId.isBlank()
                || !Objects.equals(assignedStoreId, resourceStoreId)) {
            throw new AccessDeniedException("Access denied for resource outside your assigned store");
        }
    }

    public static boolean matchesCurrentStore(String resourceStoreId) {
        Optional<UserPrincipal> principalOpt = getCurrentPrincipal();
        if (principalOpt.isEmpty()) {
            return true;
        }
        String assignedStoreId = principalOpt.get().getStoreId();
        return assignedStoreId != null && Objects.equals(assignedStoreId, resourceStoreId);
    }
}
