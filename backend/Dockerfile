# syntax=docker/dockerfile:1
FROM eclipse-temurin:25-jdk-jammy AS build

WORKDIR /app

COPY .mvn/  .mvn/
COPY mvnw   mvnw
COPY pom.xml pom.xml

RUN chmod +x mvnw

# Cache Maven dependencies across builds — only invalidated when pom.xml changes
RUN --mount=type=cache,target=/root/.m2 \
    ./mvnw dependency:go-offline --batch-mode -q

COPY src/ src/

RUN --mount=type=cache,target=/root/.m2 \
    ./mvnw --batch-mode package -DskipTests -q

FROM eclipse-temurin:25-jre-jammy AS runtime

WORKDIR /app

RUN groupadd -r appgroup && useradd -r -g appgroup appuser
USER appuser

COPY --from=build /app/target/auto-apply-*.jar app.jar

EXPOSE 8080

ENTRYPOINT ["sh", "-c", "java \
  -XX:+UseZGC \
  -Xms128m \
  -Xmx160m \
  -XX:SoftMaxHeapSize=148m \
  -XX:MaxMetaspaceSize=128m \
  -XX:ReservedCodeCacheSize=32m \
  -XX:MaxDirectMemorySize=32m \
  -XX:+EnableDynamicAgentLoading \
  --enable-native-access=ALL-UNNAMED \
  -jar app.jar \
  --server.port=${PORT:-8080} \
  --spring.profiles.active=${SPRING_PROFILES_ACTIVE:-default}"]
