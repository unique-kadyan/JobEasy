package com.kaddy.autoapply.config.aop;

import io.micrometer.core.instrument.MeterRegistry;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.annotation.Pointcut;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.util.concurrent.TimeUnit;

@Aspect
@Component
public class LoggingAspect {

    private static final Logger log = LoggerFactory.getLogger(LoggingAspect.class);
    private static final long SLOW_THRESHOLD_MS = 500;

    private final MeterRegistry meterRegistry;

    public LoggingAspect(MeterRegistry meterRegistry) {
        this.meterRegistry = meterRegistry;
    }

    @Pointcut("within(com.kaddy.autoapply.controller..*)")
    public void controllerMethods() {}

    @Pointcut("within(com.kaddy.autoapply.service..*)")
    public void serviceMethods() {}

    @Around("controllerMethods() || serviceMethods()")
    public Object logExecutionTime(ProceedingJoinPoint joinPoint) throws Throwable {
        String className  = joinPoint.getSignature().getDeclaringType().getSimpleName();
        String methodName = joinPoint.getSignature().getName();
        String shortSig   = joinPoint.getSignature().toShortString();
        long start = System.nanoTime();

        try {
            Object result = joinPoint.proceed();
            long ms = (System.nanoTime() - start) / 1_000_000;

            meterRegistry.timer("app.method.execution",
                    "class", className, "method", methodName)
                    .record(ms, TimeUnit.MILLISECONDS);

            if (ms > SLOW_THRESHOLD_MS) {
                log.warn("SLOW: {} took {} ms", shortSig, ms);
                meterRegistry.counter("app.method.slow",
                        "class", className, "method", methodName).increment();
            } else {
                log.debug("{} completed in {} ms", shortSig, ms);
            }
            return result;

        } catch (Throwable ex) {
            long ms = (System.nanoTime() - start) / 1_000_000;
            log.error("{} failed after {} ms: {}", shortSig, ms, ex.getMessage());
            meterRegistry.counter("app.method.errors",
                    "class", className, "method", methodName).increment();
            throw ex;
        }
    }
}
