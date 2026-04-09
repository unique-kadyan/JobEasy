package com.kaddy.autoapply.security;

import com.kaddy.autoapply.service.TokenBlacklistService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;
import java.util.Optional;

/**
 * Validates every inbound JWT and, on success, populates the
 * {@link SecurityContextHolder} with a fully-typed authentication object.
 *
 * <h3>Principal and authorities</h3>
 * <ul>
 *   <li>{@code Authentication.getPrincipal()} → the user's MongoDB {@code _id} string
 *       (used by every controller to identify the caller).</li>
 *   <li>{@code Authentication.getCredentials()} → the user's e-mail address.</li>
 *   <li>{@code Authentication.getAuthorities()} → {@link SimpleGrantedAuthority}
 *       objects built from the {@code roles} JWT claim (e.g. {@code ROLE_USER},
 *       {@code ROLE_ADMIN}).  This enables {@code @PreAuthorize("hasRole('ADMIN')")}
 *       and {@code hasAuthority()} expressions without an extra DB lookup per request.</li>
 * </ul>
 *
 * <h3>Security checks</h3>
 * <ol>
 *   <li>Signature validation — {@link JwtTokenProvider#validateToken}.</li>
 *   <li>Token-type guard — only {@code type=access} tokens are accepted; refresh
 *       tokens cannot be used to call API endpoints.</li>
 *   <li>Blacklist check — invalidated (logged-out) tokens are rejected via Redis.</li>
 * </ol>
 */
@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtTokenProvider    tokenProvider;
    private final TokenBlacklistService blacklistService;

    public JwtAuthenticationFilter(JwtTokenProvider tokenProvider,
                                   TokenBlacklistService blacklistService) {
        this.tokenProvider    = tokenProvider;
        this.blacklistService = blacklistService;
    }

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request,
                                    @NonNull HttpServletResponse response,
                                    @NonNull FilterChain filterChain)
            throws ServletException, IOException {

        extractToken(request).ifPresent(token -> {
            if (tokenProvider.validateToken(token)
                    && tokenProvider.isAccessToken(token)
                    && !blacklistService.isBlacklisted(token)) {

                String userId = tokenProvider.getUserIdFromToken(token);
                String email  = tokenProvider.getEmailFromToken(token);

                // Build GrantedAuthority list from roles embedded in the JWT.
                // No DB round-trip needed — roles are verified by the JWT signature.
                List<GrantedAuthority> authorities = tokenProvider.getRolesFromToken(token)
                        .stream()
                        .map(SimpleGrantedAuthority::new)
                        .map(a -> (GrantedAuthority) a)
                        .toList();

                UsernamePasswordAuthenticationToken authentication =
                        new UsernamePasswordAuthenticationToken(userId, email, authorities);
                authentication.setDetails(
                        new WebAuthenticationDetailsSource().buildDetails(request));

                SecurityContextHolder.getContext().setAuthentication(authentication);
            }
        });

        filterChain.doFilter(request, response);
    }

    private Optional<String> extractToken(HttpServletRequest request) {
        return Optional.ofNullable(request.getHeader("Authorization"))
                .filter(h -> StringUtils.hasText(h) && h.startsWith("Bearer "))
                .map(h -> h.substring(7));
    }
}
