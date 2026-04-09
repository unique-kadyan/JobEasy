package com.kaddy.autoapply.security;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

/**
 * Stateless helpers for reading the current security context.
 *
 * <p>Injecting {@code Authentication} into every service method is verbose and
 * makes signatures noisy.  These utilities let service internals — particularly
 * ownership checks and admin-bypass guards — read the security context without
 * coupling method signatures to Spring Security types.
 *
 * <h3>Admin bypass pattern</h3>
 * <pre>{@code
 * private void assertOwnership(String resourceUserId) {
 *     if (!resourceUserId.equals(SecurityUtils.currentUserId()) && !SecurityUtils.isAdmin()) {
 *         throw new BadRequestException("Access denied");
 *     }
 * }
 * }</pre>
 */
public final class SecurityUtils {

    private SecurityUtils() {}

    /**
     * Returns {@code true} when the authenticated principal holds the
     * {@code ROLE_ADMIN} authority.
     *
     * <p>Admins can read and modify any user's data without paying fees.
     * This method is the single gating point for that bypass so that
     * changing the admin-role name only requires one edit here.
     */
    public static boolean isAdmin() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth != null && auth.getAuthorities().stream()
                .anyMatch(a -> "ROLE_ADMIN".equals(a.getAuthority()));
    }

    /**
     * Returns the MongoDB user-id of the currently authenticated principal,
     * or {@code null} when there is no authentication context (e.g. in a
     * scheduled task or async callback that runs outside a request thread).
     */
    public static String currentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) return null;
        Object principal = auth.getPrincipal();
        return principal instanceof String s ? s : null;
    }
}
