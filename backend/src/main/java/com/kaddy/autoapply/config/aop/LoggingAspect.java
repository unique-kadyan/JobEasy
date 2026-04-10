package com.kaddy.autoapply.config.aop;

import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.annotation.Pointcut;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

@Aspect
@Component
public class LoggingAspect {

    private static final Logger log = LoggerFactory.getLogger(LoggingAspect.class);

    @Pointcut("within(com.kaddy.autoapply.controller..*)")
    public void controllerMethods() {}

    @Pointcut("within(com.kaddy.autoapply.service..*)")
    public void serviceMethods() {}

    @Around("controllerMethods() || serviceMethods()")
    public Object logExecutionTime(ProceedingJoinPoint joinPoint) throws Throwable {
        String method = joinPoint.getSignature().toShortString();
        long start = System.nanoTime();
        try {
            Object result = joinPoint.proceed();
            long ms = (System.nanoTime() - start) / 1_000_000;
            if (ms > 500) {
                log.warn("SLOW: {} took {} ms", method, ms);
            } else {
                log.debug("{} completed in {} ms", method, ms);
            }
            return result;
        } catch (Throwable ex) {
            long ms = (System.nanoTime() - start) / 1_000_000;
            log.error("{} failed after {} ms: {}", method, ms, ex.getMessage());
            throw ex;
        }
    }
}
