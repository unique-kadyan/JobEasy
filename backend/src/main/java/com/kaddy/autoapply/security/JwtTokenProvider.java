package com.kaddy.autoapply.security;

import com.kaddy.autoapply.model.enums.Role;
import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Collection;
import java.util.Date;
import java.util.List;

@Component
public class JwtTokenProvider {

    private static final String CLAIM_EMAIL = "email";
    private static final String CLAIM_TYPE  = "type";
    private static final String CLAIM_ROLES = "roles";

    private final SecretKey key;
    private final long accessTokenExpiry;
    private final long refreshTokenExpiry;

    public JwtTokenProvider(
            @Value("${app.jwt.secret}") String secret,
            @Value("${app.jwt.access-token-expiry}") long accessTokenExpiry,
            @Value("${app.jwt.refresh-token-expiry}") long refreshTokenExpiry) {
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.accessTokenExpiry  = accessTokenExpiry;
        this.refreshTokenExpiry = refreshTokenExpiry;
    }

    public String generateAccessToken(String userId, String email, Collection<Role> roles) {
        return buildToken(userId, email, accessTokenExpiry, "access", roles);
    }

    public String generateRefreshToken(String userId, String email, Collection<Role> roles) {
        return buildToken(userId, email, refreshTokenExpiry, "refresh", roles);
    }

    private String buildToken(String userId, String email, long expiry,
                              String type, Collection<Role> roles) {
        Date now = new Date();

        List<String> roleNames = (roles != null && !roles.isEmpty())
                ? roles.stream().map(Role::name).toList()
                : List.of(Role.ROLE_USER.name());

        return Jwts.builder()
                .subject(userId)
                .claim(CLAIM_EMAIL, email)
                .claim(CLAIM_TYPE, type)
                .claim(CLAIM_ROLES, roleNames)
                .issuedAt(now)
                .expiration(new Date(now.getTime() + expiry))
                .signWith(key)
                .compact();
    }

    public String getUserIdFromToken(String token) {
        return parseClaims(token).getSubject();
    }

    public String getEmailFromToken(String token) {
        return parseClaims(token).get(CLAIM_EMAIL, String.class);
    }

    public List<String> getRolesFromToken(String token) {
        Object raw = parseClaims(token).get(CLAIM_ROLES);
        if (raw instanceof List<?> list && !list.isEmpty()) {
            return list.stream().map(Object::toString).toList();
        }
        return List.of(Role.ROLE_USER.name());
    }

    public boolean validateToken(String token) {
        try {
            parseClaims(token);
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }

    public boolean isAccessToken(String token) {
        return "access".equals(parseClaims(token).get(CLAIM_TYPE, String.class));
    }

    public long getRemainingTtlSeconds(String token) {
        long expiryMs    = parseClaims(token).getExpiration().getTime();
        long remainingMs = expiryMs - System.currentTimeMillis();
        return Math.max(0L, remainingMs / 1000);
    }

    private Claims parseClaims(String token) {
        return Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }
}
