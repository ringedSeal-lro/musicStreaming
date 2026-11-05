# ---- build ----
FROM maven:3.9.9-eclipse-temurin-17 AS build

WORKDIR /app

# baixa as dependências numa camada própria (cache entre builds)
COPY pom.xml .
RUN mvn -q -B dependency:go-offline

COPY src ./src
RUN mvn -q -B clean package -DskipTests

# ---- runtime ----
FROM eclipse-temurin:17-jre

WORKDIR /app

# /app/streaming = músicas (bind mount), /app/data = banco H2 (volume).
# Permissão aberta em /app/data para o app rodar com o UID do host (veja o compose).
RUN mkdir -p /app/streaming /app/data && chmod 0777 /app/data

COPY --from=build /app/target/*.jar app.jar

ENV MUSIC_ROOT=/app/streaming \
    MUSIC_DATA=/app/data \
    JAVA_OPTS="-XX:MaxRAMPercentage=75"

EXPOSE 8080

# bash puro, sem depender de curl/wget na imagem
HEALTHCHECK --interval=15s --timeout=5s --start-period=40s --retries=5 \
  CMD bash -c 'exec 3<>/dev/tcp/127.0.0.1/8080 && printf "GET /actuator/health HTTP/1.0\r\n\r\n" >&3 && grep -q "\"UP\"" <&3'

ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar app.jar"]
