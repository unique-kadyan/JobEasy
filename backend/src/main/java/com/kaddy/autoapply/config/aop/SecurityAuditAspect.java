package com.kaddy.autoapply.config.aop;

import org.aspectj.lang.JoinPoint;
import org.aspectj.lang.annotation.AfterReturning;
import org.aspectj.lang.annotation.AfterThrowing;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.annotation.Pointcut;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

import java.util.Optional;

/**
 * Audits security-sensitive operations (auth events and job applications).
 */
@Aspect
@Component
public class SecurityAuditAspect {

    private static final Logger log = LoggerFactory.getLogger(SecurityAuditAspect.class);

    @Pointcut("execution(* com.kaddy.autoapply.controller.AuthController.*(..))")
    public void authOperations() {}

    @Pointcut("execution(* com.kaddy.autoapply.service.ApplicationService.apply(..))")
    public void applicationOperations() {}

    @AfterReturning("authOperations()")
    public void auditAuth(JoinPoint joinPoint) {
        log.info("AUDIT: Auth operation '{}' by user '{}'",
                joinPoint.getSignature().getName(), currentUser());
    }

    @AfterReturning("applicationOperations()")
    public void auditApplication(JoinPoint joinPoint) {
        log.info("AUDIT: Job application submitted by user '{}'", currentUser());
    }

    @AfterThrowing(pointcut = "authOperations()", throwing = "ex")
    public void auditAuthFailure(JoinPoint joinPoint, Throwable ex) {
        log.warn("AUDIT: Auth operation '{}' failed: {}",
                joinPoint.getSignature().getName(), ex.getMessage());
    }

    private String currentUser() {
        return Optional.ofNullable(SecurityContextHolder.getContext().getAuthentication())
                .map(auth -> String.valueOf(auth.getPrincipal()))
                .orElse("anonymous");
    }
}
