# ─────────────────────────────────────────────────────────────────────────────
# Multi-stage build for the Kaddy Auto-Apply Spring Boot backend.
#
# Stage 1 — build:  compile and package the JAR using Maven Wrapper.
#                   Eclipse Temurin 25 JDK image is used so the build
#                   environment exactly matches the declared java.version in
#                   pom.xml and the .java-version file at the project root.
#
# Stage 2 — runtime: copy only the executable JAR into a minimal JRE image.
#                    This keeps the final image small (~200 MB vs ~500 MB with JDK).
#
# Build context: backend/
# ─────────────────────────────────────────────────────────────────────────────

# ── Stage 1: build ────────────────────────────────────────────────────────────
FROM eclipse-temurin:25-jdk-alpine AS build

WORKDIR /app

# Copy Maven Wrapper first so Docker can cache the dependency-download layer
# independently of source changes.
COPY .mvn/  .mvn/
COPY mvnw   mvnw
COPY pom.xml pom.xml

# Pre-fetch all dependencies (cached unless pom.xml changes).
RUN ./mvnw dependency:go-offline --batch-mode -q

# Copy application source and build the fat JAR.
# -DskipTests: tests run in CI; not repeated here to keep image build fast.
COPY src/ src/
RUN ./mvnw --batch-mode package -DskipTests

# ── Stage 2: runtime ──────────────────────────────────────────────────────────
FROM eclipse-temurin:25-jre-alpine AS runtime

WORKDIR /app

# Non-root user — OWASP hardening (never run as root in containers).
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

# Copy only the packaged JAR from the build stage.
COPY --from=build /app/target/auto-apply-*.jar app.jar

# Render (and every other PaaS) injects a PORT env var at container start.
# We use the shell form of ENTRYPOINT so the ${PORT:-8080} variable is
# evaluated at runtime (not at image-build time).
EXPOSE 8080

# ── Memory budget for Render free tier (512 MB container) ────────────────────
#
#   Component              Flag                         Budget
#   ─────────────────────  ───────────────────────────  ──────
#   Heap (ZGC managed)     -Xms32m / -Xmx180m           180 MB max
#   ZGC soft target        -XX:SoftMaxHeapSize=150m      tries to stay ≤ 150 MB
#   Metaspace (classes)    -XX:MaxMetaspaceSize=96m       96 MB max
#   JIT code cache         -XX:ReservedCodeCacheSize=32m  32 MB max
#   Netty direct buffers   -XX:MaxDirectMemorySize=32m    32 MB max
#   JVM overhead (threads, — (not configurable)          ~40 MB
#     stack frames, etc.)
#   ─────────────────────                               ──────
#   Total worst-case                                    ~380 MB  ← within 512 MB
#
# To reach < 125 MB you need GraalVM Native Image (changes the build entirely).
ENTRYPOINT ["sh", "-c", "java \
  -XX:+UseZGC \
  -Xms32m \
  -Xmx180m \
  -XX:SoftMaxHeapSize=150m \
  -XX:MaxMetaspaceSize=96m \
  -XX:ReservedCodeCacheSize=32m \
  -XX:MaxDirectMemorySize=32m \
  -XX:+EnableDynamicAgentLoading \
  --enable-native-access=ALL-UNNAMED \
  -jar app.jar \
  --server.port=${PORT:-8080}"]
