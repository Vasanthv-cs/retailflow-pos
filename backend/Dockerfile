# ==============================================================================
# RetailFlow POS Backend — Production Multi-Stage Dockerfile
# Optimized for Railway & Cloud Container Deployments
# Base Image: Eclipse Temurin Java 21 LTS
# ==============================================================================

# ------------------------------------------------------------------------------
# Stage 1: Build & Package the Application
# ------------------------------------------------------------------------------
FROM eclipse-temurin:21-jdk-jammy AS builder

WORKDIR /build

# Install Maven
RUN apt-get update && apt-get install -y --no-install-recommends maven && rm -rf /var/lib/apt/lists/*

# Cache dependencies layer
COPY pom.xml .
RUN mvn dependency:go-offline -B

# Copy source and build executable JAR
COPY src ./src
RUN mvn clean package -DskipTests -B

# Extract Spring Boot layers for efficient Docker caching
WORKDIR /build/target
RUN java -Djarmode=layertools -jar *.jar extract

# ------------------------------------------------------------------------------
# Stage 2: Minimal Production Runtime
# ------------------------------------------------------------------------------
FROM eclipse-temurin:21-jre-jammy AS runtime

# Install curl for container health check
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*

# Run as an unprivileged service user for defense-in-depth security
RUN addgroup --system spring && adduser --system --ingroup spring spring
USER spring:spring

WORKDIR /app

# Copy layered Spring Boot artifacts from builder
COPY --from=builder --chown=spring:spring /build/target/dependencies/ ./
COPY --from=builder --chown=spring:spring /build/target/spring-boot-loader/ ./
COPY --from=builder --chown=spring:spring /build/target/snapshot-dependencies/ ./
COPY --from=builder --chown=spring:spring /build/target/application/ ./

# Container-aware JVM memory configuration:
# - UseContainerSupport: respects cgroup memory limits in Railway/K8s
# - MaxRAMPercentage=75: allows 25% overhead for OS and JVM native memory
# - Faster random seed generation
ENV JAVA_OPTS="-XX:+UseContainerSupport -XX:MaxRAMPercentage=75.0 -Djava.security.egd=file:/dev/./urandom -Duser.timezone=Asia/Kolkata"
ENV SPRING_PROFILES_ACTIVE="prod"

# Railway injects the PORT environment variable dynamically
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:${PORT:-8080}/api/v1/health || exit 1

ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS org.springframework.boot.loader.launch.JarLauncher"]
