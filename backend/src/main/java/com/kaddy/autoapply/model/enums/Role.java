package com.kaddy.autoapply.model.enums;

/**
 * Application roles carried inside JWT claims and set as Spring Security
 * {@code GrantedAuthority} objects by {@code JwtAuthenticationFilter}.
 *
 * <p>Naming follows Spring Security convention — prefixed with {@code ROLE_}
 * so that {@code hasRole('USER')} in {@code @PreAuthorize} resolves to
 * the {@code ROLE_USER} authority automatically.
 *
 * <ul>
 *   <li>{@link #ROLE_USER} — every registered account, assigned at signup.</li>
 *   <li>{@link #ROLE_ADMIN} — privileged access for operations such as
 *       system-template management, actuator endpoints, and aggregate analytics.</li>
 * </ul>
 */
public enum Role {

    /** Standard user role — assigned to every new account by default. */
    ROLE_USER,

    /** Administrative role — grants access to restricted management endpoints. */
    ROLE_ADMIN
}
