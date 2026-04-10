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
        log.info("AUDIT: Auth operation '{}' by user '{}'",
                joinPoint.getSignature().getName(), currentUser());
    }

    @AfterReturning("applicationOperations()")
    public void auditApplication(JoinPoint joinPoint) {
        log.info("AUDIT: Application operation '{}' by user '{}'",
                joinPoint.getSignature().getName(), currentUser());
    }

    @AfterReturning("paymentOperations()")
    public void auditPayment(JoinPoint joinPoint) {
        log.info("AUDIT: Payment operation '{}' by user '{}'",
                joinPoint.getSignature().getName(), currentUser());
    }

    @AfterThrowing(pointcut = "paymentOperations()", throwing = "ex")
    public void auditPaymentFailure(JoinPoint joinPoint, Throwable ex) {
        log.warn("AUDIT: Payment operation '{}' failed for user '{}': {}",
                joinPoint.getSignature().getName(), currentUser(), ex.getMessage());
    }

    @AfterReturning("subscriptionOperations()")
    public void auditSubscription(JoinPoint joinPoint) {
        log.info("AUDIT: Subscription operation '{}' by user '{}'",
                joinPoint.getSignature().getName(), currentUser());
    }

    @AfterReturning("resumeOperations()")
    public void auditResume(JoinPoint joinPoint) {
        log.info("AUDIT: Resume operation '{}' by user '{}'",
                joinPoint.getSignature().getName(), currentUser());
    }

    @AfterReturning("profileOperations()")
    public void auditProfile(JoinPoint joinPoint) {
        log.info("AUDIT: Profile operation '{}' by user '{}'",
                joinPoint.getSignature().getName(), currentUser());
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
