FROM eclipse-temurin:25-jdk-jammy AS build

WORKDIR /app

COPY .mvn/  .mvn/
COPY mvnw   mvnw
COPY pom.xml pom.xml

RUN chmod +x mvnw && ./mvnw dependency:go-offline --batch-mode -q

COPY src/ src/
RUN ./mvnw --batch-mode package -DskipTests

FROM eclipse-temurin:25-jre-jammy AS runtime

WORKDIR /app

RUN groupadd -r appgroup && useradd -r -g appgroup appuser
USER appuser

COPY --from=build /app/target/auto-apply-*.jar app.jar

EXPOSE 8080

ENTRYPOINT ["sh", "-c", "java \
  -XX:+UseZGC \
  -XX:+ZGenerational \
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
