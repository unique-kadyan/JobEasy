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

/**
 * Executor configuration — thread lifecycle, memory safety, and security-context
 * propagation for all async and parallel work in the application.
 *
 * <h2>Thread types</h2>
 *
 * <h3>Virtual threads ({@code taskExecutor}, {@code virtualThreadExecutor})</h3>
 * <ul>
 *   <li>Created fresh for every submitted task via {@link BoundedVirtualExecutor};
 *       destroyed the instant the task returns — zero idle time, zero retained OS stack.</li>
 *   <li>No pool means no reuse, which eliminates the class of bug where task A's
 *       state bleeds into task B on a recycled thread.</li>
 *   <li>Each virtual thread carries its own {@code ThreadLocal} store.  Because
 *       Spring Security's {@code SecurityContextHolder} uses {@code ThreadLocal}
 *       by default, a new virtual thread starts with an <em>empty</em> context.
 *       {@link BoundedVirtualExecutor} snapshots the {@code SecurityContext} and
 *       MDC from the submitting thread, applies them before {@code run()}, then
 *       clears both in {@code finally}.</li>
 *   <li>A {@link Semaphore} caps concurrency at {@value #VT_ASYNC_CONCURRENCY} /
 *       {@value #VT_CF_CONCURRENCY} tasks respectively.  When the cap is reached
 *       the submitting virtual thread <em>parks</em> (carrier freed) until a permit
 *       is released — natural back-pressure without OOM or unbounded heap growth.</li>
 *   <li>Virtual threads park (unmount from carrier) during any blocking I/O call
 *       (MongoDB, Redis, HTTP).  The carrier thread pool stays at ≈ CPU count;
 *       millions of concurrent virtual threads can be in-flight simultaneously
 *       without proportional OS threads.</li>
 * </ul>
 *
 * <h3>Platform threads ({@code boundedTaskExecutor})</h3>
 * <ul>
 *   <li>Used for CPU-bound work (PDF parsing, regex scoring) where virtual-thread
 *       parking provides no benefit and a CPU-bound virtual thread would tie up
 *       its carrier for its entire duration.</li>
 *   <li>Pool size: {@code CORES} core / {@code CORES × 2} max — fully utilises
 *       available CPUs during peak and bounds memory footprint.</li>
 *   <li><b>Idle destruction</b>: both core and non-core threads are destroyed after
 *       {@value #KEEP_ALIVE_SECONDS} s of inactivity
 *       ({@code allowCoreThreadTimeOut = true}).  During quiet periods the pool
 *       drains to zero, releasing ≈ 2 MB of OS thread stack per destroyed thread.
 *       ZGC's {@code -XX:+ZUncommit} then returns the now-free heap pages to the
 *       OS.</li>
 *   <li><b>State cleaning</b>: the {@link ThreadStateCleaningDecorator} is
 *       <em>mandatory</em> for pooled threads.  Without it, a thread finishing
 *       task A could carry A's {@code SecurityContext} and MDC map into task B —
 *       wrong user, garbled trace IDs.</li>
 *   <li><b>Back-pressure</b>: {@code CallerRunsPolicy} + queue cap (500).  When
 *       the queue is full the submitting thread executes the task itself — natural
 *       back-pressure without OOM from an unbounded task queue.</li>
 * </ul>
 *
 * <h2>Carrier thread pinning</h2>
 * <p>A virtual thread <em>pins</em> (cannot unmount from its carrier) when it
 * enters a {@code synchronized} block or calls a native method.  The JVM flag
 * {@code -Djdk.tracePinnedThreads=short} logs a one-line stack trace every time
 * pinning occurs, making it easy to find {@code synchronized} hotspots that should
 * be replaced with {@code ReentrantLock} or {@code StampedLock}.
 */
@Configuration
@EnableAsync
public class AsyncConfig implements AsyncConfigurer {

    private static final Logger log = LoggerFactory.getLogger(AsyncConfig.class);

    /** Physical CPU cores — used to size the CPU-bound pool. */
    private static final int CORES = Runtime.getRuntime().availableProcessors();

    /**
     * Idle duration before a pooled platform thread is destroyed.
     * Applies to both core and non-core threads ({@code allowCoreThreadTimeOut=true}).
     * After this interval the OS thread stack (≈ 2 MB) is released.
     */
    private static final int KEEP_ALIVE_SECONDS = 60;

    /**
     * Maximum number of <em>concurrently active</em> virtual threads for general
     * {@code @Async} work (email, AI calls, GitHub import, etc.).
     *
     * <p>Chosen to stay well below the downstream bottlenecks that bound real
     * throughput — MongoDB connection pool (100), Redis pool (50), outbound HTTP
     * pool (500).  Beyond those limits, extra virtual threads would just queue on
     * a DB/Redis/HTTP connection anyway; capping here keeps heap allocations and
     * GC pressure proportionate to what can actually make progress.
     *
     * <p>When the limit is reached the submitting virtual thread <em>parks</em>
     * (its carrier thread is immediately freed) until a slot opens — natural
     * back-pressure without {@code RejectedExecutionException} or OOM.
     */
    private static final int VT_ASYNC_CONCURRENCY = 500;

    /**
     * Maximum concurrently active virtual threads for explicit
     * {@code CompletableFuture} fan-outs (scraper orchestration, analytics,
     * cover-letter parallel sub-tasks, stale-job pruning).
     *
     * <p>Set below the outbound HTTP connection-pool cap ({@code 500}) so that
     * parallel I/O tasks can always acquire a connection without racing.
     * The submitting virtual thread parks when the limit is full — no exceptions,
     * no unbounded queue growth.
     */
    private static final int VT_CF_CONCURRENCY = 300;

    // ── Default @Async executor — virtual threads ─────────────────────────────

    /**
     * Default executor for all {@code @Async} methods (email sending, AI calls,
     * GitHub import, etc.).
     *
     * <p>Uses {@link BoundedVirtualExecutor}: each submitted task runs on a fresh
     * Java 21 virtual thread, destroyed on completion — no idle threads, no stale
     * state, no retained stack memory.
     *
     * <p>The executor snapshots the caller's {@code SecurityContext} and MDC at
     * submission, applies them on the virtual thread before {@code run()}, and
     * clears both in {@code finally} — so {@code @PreAuthorize} and
     * {@code SecurityUtils.isAdmin()} work correctly inside async methods.
     *
     * <p>Concurrency is capped at {@value #VT_ASYNC_CONCURRENCY}.  Submitters park
     * (carry-thread freed) when the cap is reached.
     */
    @Override
    @Bean(name = "taskExecutor")
    @Primary
    public Executor getAsyncExecutor() {
        return new BoundedVirtualExecutor("async-vt-", VT_ASYNC_CONCURRENCY);
    }

    // ── CPU-bound executor — bounded platform threads with state cleaning ─────

    /**
     * Executor for CPU-intensive work (resume PDF parsing, regex keyword scoring).
     *
     * <p>Platform threads are REUSED.  The {@link ThreadStateCleaningDecorator}
     * ensures that every task starts with a fresh {@link SecurityContext} and MDC
     * snapshot (captured from the submitting thread) and that both are wiped in
     * {@code finally} before the thread returns to the pool — no data from task A
     * can ever leak into task B.
     *
     * <p>Both core and non-core threads are destroyed after {@value KEEP_ALIVE_SECONDS} s
     * of idleness, freeing OS thread stacks during quiet periods.
     */
    @Bean("boundedTaskExecutor")
    Executor boundedTaskExecutor() {
        ThreadPoolTaskExecutor exec = new ThreadPoolTaskExecutor();
        exec.setCorePoolSize(CORES);
        exec.setMaxPoolSize(CORES * 2);
        exec.setQueueCapacity(500);
        exec.setKeepAliveSeconds(KEEP_ALIVE_SECONDS);
        exec.setAllowCoreThreadTimeOut(true);           // core threads also reclaimed when idle
        exec.setThreadNamePrefix("cpu-bound-");
        exec.setRejectedExecutionHandler(new ThreadPoolExecutor.CallerRunsPolicy());
        // CRITICAL: wipes SecurityContext + MDC between tasks on reused threads.
        exec.setTaskDecorator(new ThreadStateCleaningDecorator());
        exec.initialize();
        return exec;
    }

    // ── Named virtual-thread executor — explicit CompletableFuture fan-outs ──

    /**
     * Named virtual-thread executor for services that orchestrate their own
     * {@code CompletableFuture} chains
     * (e.g. {@code ScraperOrchestrator}, {@code AnalyticsService},
     * {@code CoverLetterService}).
     *
     * <p>Injected via {@code @Qualifier("virtualThreadExecutor")}.  Security-context
     * and MDC propagation is handled identically to {@code taskExecutor} — all tasks
     * execute with the submitting thread's principal, then clean up in {@code finally}.
     *
     * <p>{@code CompletableFuture.supplyAsync(task, executor)} requires only an
     * {@link Executor}, which {@link BoundedVirtualExecutor} implements directly.
     *
     * <p>Concurrency is capped at {@value #VT_CF_CONCURRENCY} concurrent fan-out
     * tasks — below the outbound HTTP connection-pool limit to prevent starvation.
     */
    @Bean("virtualThreadExecutor")
    Executor virtualThreadExecutor() {
        return new BoundedVirtualExecutor("cf-vt-", VT_CF_CONCURRENCY);
    }

    // ── Uncaught exception handler ────────────────────────────────────────────

    /**
     * Logs unhandled exceptions from {@code @Async} methods including the full
     * stack trace.  Without this, async failures are silently swallowed.
     */
    @Override
    public AsyncUncaughtExceptionHandler getAsyncUncaughtExceptionHandler() {
        return (ex, method, params) ->
                log.error("Uncaught exception in @Async {}.{}: {}",
                        method.getDeclaringClass().getSimpleName(),
                        method.getName(),
                        ex.getMessage(),
                        ex);
    }

    // ── Bounded virtual-thread executor ───────────────────────────────────────

    /**
     * Self-contained {@link Executor} that runs each task on a brand-new Java 21
     * virtual thread while enforcing a hard concurrency ceiling via a
     * {@link Semaphore}.
     *
     * <h3>Per-task contract</h3>
     * <ol>
     *   <li><b>Snapshot</b> — captures the submitting thread's {@link SecurityContext}
     *       and SLF4J {@link MDC} map <em>before</em> the virtual thread starts.</li>
     *   <li><b>Acquire</b> — acquires a semaphore permit; if the cap is reached the
     *       submitting virtual thread <em>parks</em> (its carrier is freed) until a
     *       running task completes and releases its permit.</li>
     *   <li><b>Apply</b> — installs the snapshot on the new virtual thread so that
     *       {@code @PreAuthorize} and {@code SecurityUtils.isAdmin()} see the correct
     *       principal.</li>
     *   <li><b>Wipe (always in finally)</b> — after {@code task.run()} returns or
     *       throws, unconditionally clears both {@code SecurityContext} and MDC,
     *       then releases the permit.  The virtual thread is then destroyed by the
     *       JVM — zero retained memory.</li>
     * </ol>
     *
     * <h3>Why this beats a thread pool for I/O-bound work</h3>
     * <p>Platform thread pools recycle threads but each idle thread still holds an
     * OS stack (≈ 2 MB).  Virtual threads have no stack when not scheduled.  The
     * semaphore gives the same back-pressure guarantee as a bounded queue without
     * retaining any memory for idle capacity.
     */
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
            // Snapshot caller-thread state BEFORE acquiring the semaphore, so that
            // the context is captured even if the caller parks waiting for a permit.
            SecurityContext capturedContext = SecurityContextHolder.getContext();
            Map<String, String> capturedMdc = MDC.getCopyOfContextMap();

            // Parks the caller's virtual thread (frees its carrier) if the concurrency
            // cap is reached.  Uninterruptible: we must not silently drop tasks.
            semaphore.acquireUninterruptibly();

            Thread.ofVirtual()
                  .name(namePrefix, counter.getAndIncrement())
                  .start(() -> {
                      try {
                          // ── PRE-RUN: load caller's context onto this virtual thread ──
                          SecurityContextHolder.setContext(capturedContext);
                          if (capturedMdc != null) {
                              MDC.setContextMap(capturedMdc);
                          } else {
                              MDC.clear();
                          }

                          task.run();

                      } finally {
                          // ── POST-RUN: always wipe + release permit ──────────────────
                          // Executes on: normal return, any exception, AND interruption.
                          // Virtual thread is destroyed by JVM immediately after finally.
                          SecurityContextHolder.clearContext();
                          MDC.clear();
                          semaphore.release();
                      }
                  });
        }
    }

    // ── Thread-state decorator for reused platform threads ───────────────────

    /**
     * Guarantees that REUSED platform threads never carry stale state between tasks.
     *
     * <h3>Per-task contract</h3>
     * <ol>
     *   <li><b>Snapshot</b> — at the moment the task is submitted to the pool,
     *       captures the {@link SecurityContext} and SLF4J {@link MDC} map from
     *       the submitting (request) thread.</li>
     *   <li><b>Apply</b> — immediately before {@code task.run()}, installs the
     *       snapshot on the pooled thread so the task executes with the correct
     *       identity and log-correlation context.</li>
     *   <li><b>Wipe (always in finally)</b> — after {@code task.run()} returns OR
     *       throws, unconditionally clears both {@code SecurityContext} and MDC.
     *       The thread returns to the pool with a completely clean slate.</li>
     * </ol>
     */
    static final class ThreadStateCleaningDecorator implements TaskDecorator {

        @Override
        public Runnable decorate(Runnable task) {
            // Capture caller-thread state at SUBMISSION time — before the pooled
            // thread picks up the task.
            SecurityContext capturedContext = SecurityContextHolder.getContext();
            Map<String, String> capturedMdc  = MDC.getCopyOfContextMap();

            return () -> {
                try {
                    // ── PRE-RUN: load caller's state onto this pooled thread ──
                    SecurityContextHolder.setContext(capturedContext);
                    if (capturedMdc != null) {
                        MDC.setContextMap(capturedMdc);
                    } else {
                        MDC.clear();
                    }

                    task.run();

                } finally {
                    // ── POST-RUN: always wipe — thread returns to pool clean ──
                    SecurityContextHolder.clearContext();
                    MDC.clear();
                }
            };
        }
    }
}
