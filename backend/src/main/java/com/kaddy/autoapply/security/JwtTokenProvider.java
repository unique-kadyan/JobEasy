package com.kaddy.autoapply.security;

import java.nio.charset.StandardCharsets;
import java.util.Collection;
import java.util.Date;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import javax.crypto.SecretKey;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import com.kaddy.autoapply.model.enums.Role;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;

@Component
public class JwtTokenProvider {

    private static final String CLAIM_EMAIL = "email";
    private static final String CLAIM_TYPE = "type";
    private static final String CLAIM_ROLES = "roles";
    private static final String ISSUER = "kaddy-autoapply";
    private static final String AUDIENCE = "kaddy-autoapply-api";
    private static final int MIN_SECRET_LEN = 32;

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
        this.accessTokenExpiry = accessTokenExpiry;
        this.refreshTokenExpiry = refreshTokenExpiry;
    }

    public String generateAccessToken(String userId, String email, Collection<Role> roles) {
        return buildToken(userId, email, accessTokenExpiry, "access", roles);
    }

    public String generateRefreshToken(String userId, String email, Collection<Role> roles) {
        return buildToken(userId, email, refreshTokenExpiry, "refresh", roles);
    }

    public String generateRefreshToken(String userId, String email, Collection<Role> roles, long customExpiry) {
        return buildToken(userId, email, customExpiry, "refresh", roles);
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
        long expiryMs = parseClaims(token).getExpiration().getTime();
        long remainingMs = expiryMs - System.currentTimeMillis();
        return Math.max(0L, remainingMs / 1000);
    }

    /**
     * Parses the token exactly once and returns all fields needed by the
     * security filter in a single record. Replaces the previous pattern of
     * calling validateToken / isAccessToken / getUserId / getEmail / getRoles
     * as five separate parseClaims() invocations per request.
     */
    public Optional<AccessTokenInfo> parseAccessToken(String token) {
        try {
            Claims claims = parseClaims(token);
            if (!"access".equals(claims.get(CLAIM_TYPE, String.class))) {
                return Optional.empty();
            }
            Object raw = claims.get(CLAIM_ROLES);
            List<String> roles = (raw instanceof List<?> list && !list.isEmpty())
                    ? list.stream().map(Object::toString).toList()
                    : List.of(Role.ROLE_USER.name());
            return Optional.of(new AccessTokenInfo(
                    claims.getSubject(),
                    claims.get(CLAIM_EMAIL, String.class),
                    roles));
        } catch (JwtException | IllegalArgumentException e) {
            return Optional.empty();
        }
    }

    /** Carries all per-request identity fields extracted from one JWT parse. */
    public record AccessTokenInfo(String userId, String email, List<String> roles) {
    }

    private Claims parseClaims(String token) {
        return Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }
}
