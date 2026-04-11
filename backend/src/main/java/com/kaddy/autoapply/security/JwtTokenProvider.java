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
import java.util.UUID;

@Component
public class JwtTokenProvider {

    private static final String CLAIM_EMAIL    = "email";
    private static final String CLAIM_TYPE     = "type";
    private static final String CLAIM_ROLES    = "roles";
    private static final String ISSUER         = "kaddy-autoapply";
    private static final String AUDIENCE       = "kaddy-autoapply-api";
    private static final int    MIN_SECRET_LEN = 32;

    private final SecretKey key;
    private final long accessTokenExpiry;
    private final long refreshTokenExpiry;

    public JwtTokenProvider(
            @Value("${app.jwt.secret}") String secret,
            @Value("${app.jwt.access-token-expiry}") long accessTokenExpiry,
            @Value("${app.jwt.refresh-token-expiry}") long refreshTokenExpiry) {
        if (secret == null || secret.length() < MIN_SECRET_LEN) {
            throw new IllegalStateException(
                "JWT secret must be at least 256 bits (" + MIN_SECRET_LEN + " characters). " +
                "Generate a secure secret with: openssl rand -base64 64");
        }
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
                .id(UUID.randomUUID().toString())
                .subject(userId)
                .issuer(ISSUER)
                .audience().add(AUDIENCE).and()
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

    public String getJtiFromToken(String token) {
        return parseClaims(token).getId();
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

    public boolean isRefreshToken(String token) {
        return "refresh".equals(parseClaims(token).get(CLAIM_TYPE, String.class));
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
