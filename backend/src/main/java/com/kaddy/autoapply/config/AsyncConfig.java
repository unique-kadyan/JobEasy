package com.kaddy.autoapply.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.aop.interceptor.AsyncUncaughtExceptionHandler;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.core.task.TaskDecorator;
import org.springframework.scheduling.annotation.AsyncConfigurer;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.Map;
import java.util.concurrent.Executor;
import java.util.concurrent.Semaphore;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.atomic.AtomicLong;

@Configuration
@EnableAsync
public class AsyncConfig implements AsyncConfigurer {

    private static final Logger log = LoggerFactory.getLogger(AsyncConfig.class);

    private static final int CORES = Runtime.getRuntime().availableProcessors();

    private static final int KEEP_ALIVE_SECONDS = 60;

    private static final int VT_ASYNC_CONCURRENCY = 500;

    private static final int VT_CF_CONCURRENCY = 300;

    @Override
    @Bean(name = "taskExecutor")
    @Primary
    public Executor getAsyncExecutor() {
        return new BoundedVirtualExecutor("async-vt-", VT_ASYNC_CONCURRENCY);
    }

    @Bean("boundedTaskExecutor")
    Executor boundedTaskExecutor() {
        ThreadPoolTaskExecutor exec = new ThreadPoolTaskExecutor();
        exec.setCorePoolSize(CORES);
        exec.setMaxPoolSize(CORES * 2);
        exec.setQueueCapacity(500);
        exec.setKeepAliveSeconds(KEEP_ALIVE_SECONDS);
        exec.setAllowCoreThreadTimeOut(true);
        exec.setThreadNamePrefix("cpu-bound-");
        exec.setRejectedExecutionHandler(new ThreadPoolExecutor.CallerRunsPolicy());

        exec.setTaskDecorator(new ThreadStateCleaningDecorator());
        exec.initialize();
        return exec;
    }

    @Bean("virtualThreadExecutor")
    Executor virtualThreadExecutor() {
        return new BoundedVirtualExecutor("cf-vt-", VT_CF_CONCURRENCY);
    }

    @Override
    public AsyncUncaughtExceptionHandler getAsyncUncaughtExceptionHandler() {
        return (ex, method, params) ->
                log.error("Uncaught exception in @Async {}.{}: {}",
                        method.getDeclaringClass().getSimpleName(),
                        method.getName(),
                        ex.getMessage(),
                        ex);
    }

    static final class BoundedVirtualExecutor implements Executor {

        private final String namePrefix;
        private final Semaphore semaphore;
        private final AtomicLong counter = new AtomicLong();

        BoundedVirtualExecutor(String namePrefix, int concurrencyLimit) {
            this.namePrefix = namePrefix;
            this.semaphore  = new Semaphore(concurrencyLimit);
        }

        @Override
        public void execute(Runnable task) {

            SecurityContext capturedContext = SecurityContextHolder.getContext();
            Map<String, String> capturedMdc = MDC.getCopyOfContextMap();

            semaphore.acquireUninterruptibly();

            Thread.ofVirtual()
                  .name(namePrefix, counter.getAndIncrement())
                  .start(() -> {
                      try {

                          SecurityContextHolder.setContext(capturedContext);
                          if (capturedMdc != null) {
                              MDC.setContextMap(capturedMdc);
                          } else {
                              MDC.clear();
                          }

                          task.run();

                      } finally {

                          SecurityContextHolder.clearContext();
                          MDC.clear();
                          semaphore.release();
                      }
                  });
        }
    }

    static final class ThreadStateCleaningDecorator implements TaskDecorator {

        @Override
        public Runnable decorate(Runnable task) {

            SecurityContext capturedContext = SecurityContextHolder.getContext();
            Map<String, String> capturedMdc  = MDC.getCopyOfContextMap();

            return () -> {
                try {

                    SecurityContextHolder.setContext(capturedContext);
                    if (capturedMdc != null) {
                        MDC.setContextMap(capturedMdc);
                    } else {
                        MDC.clear();
                    }

                    task.run();

                } finally {

                    SecurityContextHolder.clearContext();
                    MDC.clear();
                }
            };
        }
    }
}
