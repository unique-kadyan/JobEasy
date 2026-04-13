package com.kaddy.autoapply.security;

import java.io.IOException;
import java.util.List;
import java.util.Optional;

import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import com.kaddy.autoapply.service.TokenBlacklistService;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtTokenProvider tokenProvider;
    private final TokenBlacklistService blacklistService;

    public JwtAuthenticationFilter(JwtTokenProvider tokenProvider,
            TokenBlacklistService blacklistService) {
        this.tokenProvider = tokenProvider;
        this.blacklistService = blacklistService;
    }

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain)
            throws ServletException, IOException {

        // Parse the JWT exactly once — validates signature + expiry and extracts
        // userId, email, roles in a single Jwts.parser() call.
        // Previously this was 5 separate parseClaims() calls per request.
        Optional<String> rawToken = extractToken(request);
        if (rawToken.isEmpty()) {
            filterChain.doFilter(request, response);
            return;
        }
        String token = rawToken.get();
        tokenProvider.parseAccessToken(token).ifPresent(info -> {
            if (blacklistService.isBlacklisted(token))
                return;
            if (blacklistService.isUserRevoked(info.userId()))
                return;

            List<GrantedAuthority> authorities = info.roles().stream()
                    .map(SimpleGrantedAuthority::new)
                    .map(a -> (GrantedAuthority) a)
                    .toList();

            UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(info.userId(),
                    info.email(), authorities);
            authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
            SecurityContextHolder.getContext().setAuthentication(authentication);
        });

        filterChain.doFilter(request, response);
    }

    private Optional<String> extractToken(HttpServletRequest request) {
        return Optional.ofNullable(request.getHeader("Authorization"))
                .filter(h -> StringUtils.hasText(h) && h.startsWith("Bearer "))
                .map(h -> h.substring(7));
    }
}
