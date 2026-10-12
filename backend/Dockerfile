# Stage 1: Build the Spring Boot JAR
FROM eclipse-temurin:21-jdk-alpine AS build
WORKDIR /app

# Install dos2unix or strip carriage returns in case files were committed on Windows
RUN apk add --no-cache dos2unix

# Copy Maven wrapper and dependencies specification
COPY .mvn/ .mvn/
COPY mvnw pom.xml ./
RUN dos2unix ./mvnw && chmod +x ./mvnw

# Pre-fetch dependencies where possible
RUN ./mvnw dependency:go-offline -B || true

# Copy source and build jar
COPY src/ src/
RUN ./mvnw clean package -DskipTests -B

# Stage 2: Self-contained runtime image (built-in PostgreSQL + Spring Boot)
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

# Install PostgreSQL, contrib (for pg_trgm), su-exec, and dos2unix
RUN apk add --no-cache postgresql postgresql-contrib su-exec dos2unix

# Prepare PostgreSQL directories
RUN mkdir -p /var/lib/postgresql/data /run/postgresql && \
    chown -R postgres:postgres /var/lib/postgresql /run/postgresql

# Create uploads directory
RUN mkdir -p uploads

# Copy executable jar from build stage
COPY --from=build /app/target/*.jar app.jar

# Copy entrypoint script
COPY entrypoint.sh ./entrypoint.sh
RUN dos2unix ./entrypoint.sh && chmod +x ./entrypoint.sh

# Expose default port (Spring Boot will override with $PORT if provided by hosting platform)
EXPOSE 8081

# Optimize JVM for 512MB RAM free containers
ENV JAVA_OPTS="-Xmx320m -Xss512k -XX:+UseContainerSupport"

ENTRYPOINT ["./entrypoint.sh"]