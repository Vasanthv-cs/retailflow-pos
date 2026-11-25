# ==============================================================================
# RetailFlow POS Backend — Production Multi-Stage Dockerfile
# Optimized for Render, Railway & Cloud Container Deployments
# Base Image: Eclipse Temurin Java 21 LTS
# ==============================================================================

# ------------------------------------------------------------------------------
# Stage 1: Build & Package the Application
# ------------------------------------------------------------------------------
FROM eclipse-temurin:21-jdk-jammy AS builder

WORKDIR /build

# Install Maven
RUN apt-get update && apt-get install -y --no-install-recommends maven && rm -rf /var/lib/apt/lists/*

# Configure Google Maven Central mirror to prevent HTTP 429 rate-limiting on shared cloud builders
RUN mkdir -p /root/.m2 && \
    echo '<settings xmlns="http://maven.apache.org/SETTINGS/1.0.0"><mirrors><mirror><id>google-maven-central</id><name>Google Maven Central</name><url>https://maven-central.storage-download.googleapis.com/maven2/</url><mirrorOf>central</mirrorOf></mirror></mirrors></settings>' > /root/.m2/settings.xml

# Copy project files and build executable JAR
COPY pom.xml .
COPY src ./src
RUN mvn clean package -Dmaven.test.skip=true -B

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

# Copy the built standalone Spring Boot executable JAR
COPY --from=builder --chown=spring:spring /build/target/retailflow-backend-*.jar /app/app.jar

# Container-aware JVM memory configuration optimized for 512MB RAM / 0.1 CPU free tier:
# - Xms128m / Xmx256m + MaxMetaspaceSize=128m: keeps total RSS ~300MB (safely under 512MB limit)
# - UseSerialGC: minimal CPU & native memory overhead on single-core/fractional-CPU containers
# - Xss512k: compact thread stack size to conserve memory
# - Faster random seed generation & Indian Standard Time
ENV JAVA_OPTS="-Xms128m -Xmx256m -XX:MaxMetaspaceSize=128m -Xss512k -XX:+UseSerialGC -Djava.security.egd=file:/dev/./urandom -Duser.timezone=Asia/Kolkata"
ENV SPRING_PROFILES_ACTIVE="prod"

# Ingress port assigned dynamically by Render or local container
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:${PORT:-8080}/api/v1/health || exit 1

ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar /app/app.jar"]
