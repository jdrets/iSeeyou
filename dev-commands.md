# ISeeYou — Comandos de desarrollo

Cheatsheet con los comandos más usados en local. Ejecutá todo desde la raíz del repo (`iseeyou/`).

---

## Docker — Infraestructura

```bash
# Levantar ClickHouse + Postgres + ingest-api
docker compose up -d

# Levantar y reconstruir todo (después de cambios en código)
docker compose up --build -d

# Solo reconstruir ingest-api (después de cambiar apps/ingest-api/)
docker compose up --build ingest-api -d

# Ver contenedores corriendo
docker ps

# Ver logs de un servicio
docker logs iseeyou_ingest_api
docker logs iseeyou_clickhouse
docker logs -f iseeyou_ingest_api   # follow en vivo

# Bajar servicios (conserva datos)
docker compose down

# Bajar y borrar volúmenes (reset total de DBs)
docker compose down -v && docker compose up -d
```

Atajos con pnpm (desde `package.json`):

```bash
pnpm db:up      # docker compose up -d
pnpm db:down    # docker compose down
pnpm db:reset   # docker compose down -v && docker compose up -d
```

---

## ingest-api — Probar endpoints

```bash
# Health check
curl http://localhost:8080/health

# Enviar un error (timestamp = ahora; no uses 1720000000000 — es julio 2024)
curl -X POST http://localhost:8080/track \
  -H "Content-Type: application/json" \
  -d "{
    \"type\": \"error\",
    \"timestamp\": $(date +%s000),
    \"payload\": {
      \"message\": \"Cannot read property of undefined\",
      \"error_type\": \"TypeError\",
      \"stack_trace\": \"at App.render (app.js:42)\",
      \"url\": \"https://example.com/dashboard\",
      \"session_id\": \"sess_abc123\"
    }
  }"

# Enviar un Web Vital
curl -X POST http://localhost:8080/track \
  -H "Content-Type: application/json" \
  -d "{
    \"type\": \"web_vital\",
    \"timestamp\": $(date +%s000),
    \"payload\": {
      \"metric_name\": \"LCP\",
      \"metric_value\": 2400.5,
      \"rating\": \"needs-improvement\",
      \"url\": \"https://example.com/\"
    }
  }"

# Enviar un evento genérico
curl -X POST http://localhost:8080/track \
  -H "Content-Type: application/json" \
  -d "{
    \"type\": \"event\",
    \"timestamp\": $(date +%s000),
    \"payload\": {
      \"event_type\": \"page_view\",
      \"event_name\": \"Home Page View\",
      \"url\": \"https://example.com/\"
    }
  }"
```

Respuesta esperada: `{"status":"accepted","count":1}`

### Payload mínimo (contrato actual)

Single (sigue soportado):

```json
{
  "type": "error | web_vital | event",
  "timestamp": 1720000000000,
  "payload": {}
}
```

Batch (lo que manda el SDK al flush):

```json
{
  "events": [
    { "type": "error", "timestamp": 1720000000000, "payload": {} },
    { "type": "event", "timestamp": 1720000000001, "payload": {} }
  ]
}
```

Máximo 100 eventos por request / 64 KB de body.

`timestamp` es Unix en **milisegundos**. Si omitís el campo o mandás `0`, la API usa la hora actual.
No uses `1720000000000` en pruebas: es **3 de julio de 2024** y no aparece arriba al ordenar por fecha reciente.

```bash
# Batch de ejemplo
curl -X POST http://localhost:8080/track \
  -H "Content-Type: application/json" \
  -d "{\"events\":[{\"type\":\"event\",\"timestamp\":$(date +%s000),\"payload\":{\"event_type\":\"custom\",\"event_name\":\"batch_demo\",\"url\":\"https://example.com/\"}}]}"
```

---

## ingest-api — Desarrollo local (sin Docker)

```bash
cd apps/ingest-api

# Compilar
go build ./...

# Correr (ClickHouse debe estar levantado en Docker)
export CLICKHOUSE_ADDR=localhost:9000
export CLICKHOUSE_DB=iseeyou
export CLICKHOUSE_USER=iseeyou
export CLICKHOUSE_PASSWORD=iseeyou_secret
go run .
```

---

## ClickHouse — Consola SQL

```bash
# Entrar al cliente (importante: usar --database iseeyou)
docker exec -it iseeyou_clickhouse clickhouse-client \
  --user iseeyou \
  --password iseeyou_secret \
  --database iseeyou
```

Dentro del cliente:

```sql
SHOW TABLES;

SELECT currentDatabase();

SELECT * FROM errors ORDER BY timestamp DESC LIMIT 10;
-- Si no ves tu fila, buscá por mensaje:
SELECT timestamp, message, error_type FROM errors WHERE message LIKE '%tu texto%' ORDER BY timestamp DESC;
SELECT * FROM web_vitals ORDER BY timestamp DESC LIMIT 10;
SELECT * FROM events ORDER BY timestamp DESC LIMIT 10;

SELECT 'errors' AS tabla, count() FROM errors
UNION ALL SELECT 'web_vitals', count() FROM web_vitals
UNION ALL SELECT 'events', count() FROM events;
```

Salir del cliente: `exit` o `Ctrl+D`.

### Consultas one-liner (sin entrar al cliente)

```bash
docker exec iseeyou_clickhouse clickhouse-client \
  --user iseeyou \
  --password iseeyou_secret \
  --database iseeyou \
  --query "SELECT message, error_type FROM errors ORDER BY timestamp DESC LIMIT 5"
```

### Forzar escritura de async inserts

Los datos pueden tardar ~200ms en aparecer. Forzá el flush:

```bash
docker exec iseeyou_clickhouse clickhouse-client \
  --user iseeyou \
  --password iseeyou_secret \
  --query "SYSTEM FLUSH ASYNC INSERT QUEUE"
```

### HTTP (desde el host)

```bash
# Ping
curl http://127.0.0.1:8123/ping

# Query vía HTTP
curl "http://127.0.0.1:8123/?user=iseeyou&password=iseeyou_secret&database=iseeyou" \
  --data "SELECT count() FROM errors"

# Consola web en el navegador
open http://127.0.0.1:8123/play
```

---

## ClickHouse — Migración de schema

Si cambiaste las tablas y ya tenías datos viejos (ej. con `project_id`):

```bash
docker exec -i iseeyou_clickhouse clickhouse-client \
  --user iseeyou \
  --password iseeyou_secret \
  --multiquery \
  < infra/clickhouse/init/002_remove_project_id.sql
```

Eso **borra y recrea** las tablas `errors`, `web_vitals` y `events`.

---

## ClickHouse — Retención de datos (TTL 30 días)

Las tablas `errors`, `web_vitals` y `events` tienen **TTL nativo de ClickHouse**:

```sql
TTL date + INTERVAL 30 DAY
```

ClickHouse elimina filas con más de 30 días **solo en background** (durante merges). No necesitás cron ni job en Laravel.

### Instalación nueva

El schema en `infra/clickhouse/init/001_create_tables.sql` ya incluye TTL de 30 días.

### Instalación existente (cambiar de 90 → 30 días)

```bash
docker exec -i iseeyou_clickhouse clickhouse-client \
  --user iseeyou \
  --password iseeyou_secret \
  --multiquery \
  < infra/clickhouse/init/003_ttl_30_days.sql
```

`MATERIALIZE TTL` fuerza la limpieza de datos viejos sin esperar al próximo merge.

### Verificar TTL activo

```bash
docker exec iseeyou_clickhouse clickhouse-client \
  --user iseeyou --password iseeyou_secret --database iseeyou \
  --query "SHOW CREATE TABLE errors"
```

Deberías ver `TTL date + INTERVAL 30 DAY`.

### Cambiar el período más adelante

Reemplazá `30` por los días que quieras en las tres tablas:

```sql
ALTER TABLE errors MODIFY TTL date + INTERVAL 60 DAY;
ALTER TABLE web_vitals MODIFY TTL date + INTERVAL 60 DAY;
ALTER TABLE events MODIFY TTL date + INTERVAL 60 DAY;
```

---

## DataGrip / DBeaver — Conexión a ClickHouse

| Campo    | Valor           |
|----------|-----------------|
| Host     | `127.0.0.1`     |
| Port     | `8123`          |
| User     | `iseeyou`        |
| Password | `iseeyou_secret` |
| Database | `iseeyou`        |

URL JDBC (si DataGrip falla con el driver nuevo):

```text
jdbc:clickhouse://127.0.0.1:8123/iseeyou?user=iseeyou&password=iseeyou_secret&ignore_unknown_config_key=true
```

Usar puerto **8123** (HTTP), no 9000 (nativo).

---

## Puertos en local

| Servicio     | Puerto | Uso                          |
|--------------|--------|------------------------------|
| ingest-api   | 8080   | `POST /track`, `GET /health` |
| ClickHouse   | 8123   | HTTP / JDBC / DataGrip       |
| ClickHouse   | 9000   | Protocolo nativo (Go driver) |
| PostgreSQL   | 5432   | Dashboard Laravel            |

---

## Troubleshooting

### `accepted` pero no veo el dato en ClickHouse

1. **Base incorrecta** — conectate a `iseeyou`, no a `default` (`USE iseeyou;`).
2. **Timestamp viejo** — los ejemplos con `1720000000000` guardan filas en **2024**. Buscá por mensaje o ordená ASC:
   ```sql
   SELECT timestamp, message FROM errors ORDER BY timestamp ASC;
   ```
3. **Async inserts** — puede tardar ~200ms; forzá flush:
   ```bash
   docker exec iseeyou_clickhouse clickhouse-client \
     --user iseeyou --password iseeyou_secret \
     --query "SYSTEM FLUSH ASYNC INSERT QUEUE"
   ```

### Error `"project_id, api_key and type are required"`

El contenedor Docker tiene código viejo. Reconstruí:

```bash
docker compose up --build ingest-api -d
```

### `SHOW TABLES` devuelve 0 filas en ClickHouse

Estás en la base `default`. Usá `--database iseeyou` o dentro del cliente:

```sql
USE iseeyou;
```

### ClickHouse unhealthy al levantar Docker

El healthcheck usa `127.0.0.1`, no `localhost` (evita problemas de IPv6 en Alpine).

### Postgres no levanta — puerto 5432 ocupado

Tenés otro Postgres local. Paralo o cambiá el puerto en `docker-compose.yml`.

### Cambié código Go pero la API no cambia

Siempre reconstruí la imagen:

```bash
docker compose up --build ingest-api -d
```

Docker **no** recompila solo porque editaste archivos `.go`.
