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

@Aspect
@Component
public class SecurityAuditAspect {

    private static final Logger log = LoggerFactory.getLogger(SecurityAuditAspect.class);

    @Pointcut("execution(* com.kaddy.autoapply.controller.AuthController.*(..))")
    public void authOperations() {}

    @Pointcut("execution(* com.kaddy.autoapply.service.ApplicationService.apply(..))" +
              " || execution(* com.kaddy.autoapply.service.ApplicationService.bulkApply(..))")
    public void applicationOperations() {}

    @Pointcut("execution(* com.kaddy.autoapply.service.PaymentService.createOrder(..))" +
              " || execution(* com.kaddy.autoapply.service.PaymentService.verifyAndUnlock(..))")
    public void paymentOperations() {}

    @Pointcut("execution(* com.kaddy.autoapply.service.SubscriptionService.*(..))")
    public void subscriptionOperations() {}

    @Pointcut("execution(* com.kaddy.autoapply.service.ResumeService.upload(..))" +
              " || execution(* com.kaddy.autoapply.service.ResumeService.delete(..))")
    public void resumeOperations() {}

    @Pointcut("execution(* com.kaddy.autoapply.service.UserService.updateProfile(..))" +
              " || execution(* com.kaddy.autoapply.service.UserService.deleteAccount(..))")
    public void profileOperations() {}

    @AfterReturning("authOperations()")
    public void auditAuth(JoinPoint joinPoint) {
        log.info("AUDIT: Auth '{}' user='{}' resource='{}'",
                s(joinPoint.getSignature().getName()), s(currentUser()), s(firstArg(joinPoint)));
    }

    @AfterReturning("applicationOperations()")
    public void auditApplication(JoinPoint joinPoint) {
        log.info("AUDIT: Application '{}' user='{}' resource='{}'",
                s(joinPoint.getSignature().getName()), s(currentUser()), s(firstArg(joinPoint)));
    }

    @AfterReturning("paymentOperations()")
    public void auditPayment(JoinPoint joinPoint) {
        log.info("AUDIT: Payment '{}' user='{}' resource='{}'",
                s(joinPoint.getSignature().getName()), s(currentUser()), s(firstArg(joinPoint)));
    }

    @AfterThrowing(pointcut = "paymentOperations()", throwing = "ex")
    public void auditPaymentFailure(JoinPoint joinPoint, Throwable ex) {
        log.warn("AUDIT: Payment '{}' FAILED user='{}' resource='{}' reason='{}'",
                s(joinPoint.getSignature().getName()), s(currentUser()),
                s(firstArg(joinPoint)), s(ex.getMessage()));
    }

    @AfterReturning("subscriptionOperations()")
    public void auditSubscription(JoinPoint joinPoint) {
        log.info("AUDIT: Subscription '{}' user='{}' resource='{}'",
                s(joinPoint.getSignature().getName()), s(currentUser()), s(firstArg(joinPoint)));
    }

    @AfterReturning("resumeOperations()")
    public void auditResume(JoinPoint joinPoint) {
        log.info("AUDIT: Resume '{}' user='{}' resource='{}'",
                s(joinPoint.getSignature().getName()), s(currentUser()), s(firstArg(joinPoint)));
    }

    @AfterReturning("profileOperations()")
    public void auditProfile(JoinPoint joinPoint) {
        log.info("AUDIT: Profile '{}' user='{}' resource='{}'",
                s(joinPoint.getSignature().getName()), s(currentUser()), s(firstArg(joinPoint)));
    }

    @AfterThrowing(pointcut = "authOperations()", throwing = "ex")
    public void auditAuthFailure(JoinPoint joinPoint, Throwable ex) {
        log.warn("AUDIT: Auth '{}' FAILED user='{}' reason='{}'",
                s(joinPoint.getSignature().getName()), s(currentUser()), s(ex.getMessage()));
    }

    /** Extracts the first String argument (usually userId or resourceId) from the join point. */
    private String firstArg(JoinPoint joinPoint) {
        Object[] args = joinPoint.getArgs();
        if (args != null) {
            for (Object arg : args) {
                if (arg instanceof String str && !str.isBlank()) return str;
            }
        }
        return "n/a";
    }

    /** Sanitizes a value for safe logging — strips newlines and non-printable characters
     *  to prevent log injection attacks. */
    private String s(String value) {
        if (value == null) return "null";
        return value
                .replaceAll("[\r\n\t]", "_")
                .replaceAll("[^\\x20-\\x7E]", "?");
    }

    private String currentUser() {
        return Optional.ofNullable(SecurityContextHolder.getContext().getAuthentication())
                .map(auth -> String.valueOf(auth.getPrincipal()))
                .orElse("anonymous");
    }
}
