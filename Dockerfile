# ==========================================
# Stage 1: Build React Frontend
# ==========================================
FROM node:22-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# ==========================================
# Stage 2: Build Spring Boot Backend
# ==========================================
FROM eclipse-temurin:21-jdk-alpine AS backend-builder
WORKDIR /app/backend
COPY backend/mvnw backend/mvnw.cmd ./
COPY backend/.mvn ./.mvn
COPY backend/pom.xml ./
RUN chmod +x ./mvnw && ./mvnw dependency:go-offline -B
COPY backend/src ./src

# Inject built frontend assets into Spring Boot's static classpath folder
COPY --from=frontend-builder /app/frontend/dist ./src/main/resources/static/
RUN ./mvnw clean package -DskipTests

# ==========================================
# Stage 3: Secure Lean Production Runtime
# ==========================================
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

RUN addgroup -S appgroup && adduser -S appuser -G appgroup
COPY --from=backend-builder /app/backend/target/*.jar app.jar
RUN mkdir -p storage/vault && chown -R appuser:appgroup /app

USER appuser
EXPOSE 8080
ENV PORT=8080

ENTRYPOINT ["java", "-jar", "app.jar"]
