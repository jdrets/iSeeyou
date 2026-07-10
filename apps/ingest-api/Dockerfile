# ─────────────────────────────────────────────────────────────────
# Stage 1: builder — compila el binario Go
# Usamos la imagen oficial de Go solo para compilar; no va al contenedor final.
# ─────────────────────────────────────────────────────────────────
FROM golang:1.26-alpine AS builder

WORKDIR /app

# Copiar dependencias primero para aprovechar la caché de capas de Docker.
# Si solo cambia el código fuente (no go.mod/go.sum), Docker no re-descarga dependencias.
COPY go.mod go.sum ./
RUN go mod download

# Copiar el resto del código fuente.
COPY *.go ./

# Compilar el binario.
# CGO_ENABLED=0 → sin dependencias de libc (necesario para Alpine).
# -ldflags="-s -w" → strip debug info para reducir el tamaño del binario.
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o ingest-api .


# ─────────────────────────────────────────────────────────────────
# Stage 2: runtime — imagen mínima con solo el binario
# ─────────────────────────────────────────────────────────────────
FROM alpine:3.21

# ca-certificates es necesario para hacer requests HTTPS (ej: OAuth, webhooks futuros).
RUN apk add --no-cache ca-certificates

WORKDIR /app
COPY --from=builder /app/ingest-api .

EXPOSE 8080

CMD ["./ingest-api"]
