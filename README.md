# SeeYou

Plataforma de observabilidad de frontend **open-source y self-hosted**. Instalás un SDK liviano en tu app web para capturar errores, eventos de usuario y (opcionalmente) Core Web Vitals — sin mandar datos a terceros.

Diseñada para correr en un VPS modesto (2 vCPU / 4 GB RAM) con ingesta de alto rendimiento.

## Qué incluye

| App | Rol |
| --- | --- |
| [`apps/sdk-js`](apps/sdk-js) | SDK de browser (< 5 KB gzip). Envía eventos vía `sendBeacon` / `fetch` |
| [`apps/ingest-api`](apps/ingest-api) | Microservicio Go. `POST /track` → batch insert en ClickHouse (< 10 ms) |
| [`apps/dashboard`](apps/dashboard) | Panel admin Laravel + Inertia + React. Auth, logs, métricas |

## Arquitectura del sistema

```
┌─────────────────────────────────────────────────────────┐
│                   Client Browser                        │
│                                                         │
│   ┌─────────────────────────────────────────────────┐   │
│   │           apps/sdk-js  (< 5 KB gzip)            │   │
│   │  window.onerror · Web Vitals · Custom Events    │   │
│   └──────────────────────┬──────────────────────────┘   │
└──────────────────────────│──────────────────────────────┘
                           │  POST /track (JSON)
                           │  navigator.sendBeacon / fetch
                           ▼
┌──────────────────────────────────────────────────────────┐
│             apps/ingest-api  (Go)                        │
│                                                         │
│  • Validate payload schema                              │
│  • Buffer events in memory                              │
│  • Batch insert → ClickHouse (async)                    │
│  • Response: 202 Accepted < 10ms                        │
└───────────────────────┬──────────────────────────────────┘
                        │  Batch INSERT (async inserts)
                        ▼
┌──────────────────────────────────────────────────────────┐
│               ClickHouse                                │
│                                                         │
│  Tables: errors · web_vitals · events                   │
│  Engine: MergeTree, partitioned by month                │
│  TTL: 30 days                                           │
└───────────────────────┬──────────────────────────────────┘
                        │  SELECT (analytics queries)
                        ▼
┌──────────────────────────────────────────────────────────┐
│             apps/dashboard  (Laravel + Inertia + React)  │
│                                                         │
│  • User auth                                            │
│  • Alert rules & notifications                          │
│  • Analytics charts (errors, vitals, events)            │
│                                                         │
│  PostgreSQL ──── users, alert_rules                     │
│  ClickHouse ──── analytics queries (read-only)          │
└──────────────────────────────────────────────────────────┘
```

Los datos analíticos viven en **ClickHouse** (TTL 30 días). Los datos transaccionales (usuarios, alertas) en **PostgreSQL**. El dashboard **nunca escribe** en ClickHouse — solo lee.

## Stack tecnológico

| Capa | Tecnologías |
| --- | --- |
| Monorepo | Turborepo, pnpm workspaces |
| SDK | TypeScript, Vite, Vitest |
| Ingesta | Go 1.26, ClickHouse driver nativo |
| Dashboard backend | Laravel 13, PHP 8.3, Eloquent |
| Dashboard frontend | React 18, Inertia.js v2, Tailwind CSS v4, TanStack Query |
| Analytics DB | ClickHouse 24 (MergeTree, async inserts) |
| Transaccional DB | PostgreSQL 17 |
| Infra local | Docker Compose |

## Estructura del monorepo

```
seeyou/
├── apps/
│   ├── sdk-js/          TypeScript SDK for the browser
│   ├── ingest-api/      High-performance Go ingest service
│   └── dashboard/       Laravel + Inertia.js + React admin panel
├── packages/            Shared libraries (types, utils)
├── infra/
│   ├── clickhouse/      ClickHouse config & schema migrations
│   │   ├── config.xml
│   │   ├── users.xml
│   │   └── init/        SQL init scripts
│   └── postgres/
│       └── init/        SQL init scripts
├── docs/
│   └── aws-deployment.md
├── docker-compose.yml   Local dev infrastructure
├── turbo.json           Turborepo pipeline config
├── pnpm-workspace.yaml  pnpm workspace definition
├── dev-commands.md      Cheatsheet de comandos
└── architecture.md      Detalle de arquitectura
```

## Contrato de payloads (SDK → ingest-api)

Evento individual:

```json
{
  "type": "error | web_vital | event",
  "timestamp": 1720000000000,
  "payload": {}
}
```

Batch (lo que envía el SDK al hacer flush):

```json
{
  "events": [
    { "type": "error", "timestamp": 1720000000000, "payload": {} },
    { "type": "event", "timestamp": 1720000000001, "payload": {} }
  ]
}
```

- `timestamp` en **milisegundos** Unix (`Date.now()`)
- Máximo **100 eventos** por request / **64 KB** de body
- ingest-api responde siempre `202 Accepted` — la ingesta nunca bloquea al cliente

## Requisitos de infraestructura (self-hosted)

| Recurso | Mínimo | Recomendado |
| --- | --- | --- |
| CPU | 2 vCPU | 4 vCPU |
| RAM | 4 GB | 8 GB |
| Storage | 20 GB SSD | 100 GB SSD |
| OS | Ubuntu 22.04+ | Ubuntu 24.04 |

Para deploy en AWS ver [`docs/aws-deployment.md`](docs/aws-deployment.md) (recomendado: `t4g.large` para primera prueba en prod).

## Requisitos previos (desarrollo local)

- [Docker](https://docs.docker.com/get-docker/) + Docker Compose
- [Node.js](https://nodejs.org/) 20+
- [pnpm](https://pnpm.io/) 9+
- [PHP](https://www.php.net/) 8.3+ y [Composer](https://getcomposer.org/)
- [Go](https://go.dev/) 1.26+ (solo si desarrollás ingest-api sin Docker)

## Levantar en local

Todo desde la raíz del repo.

### 1. Infraestructura (ClickHouse + Postgres + ingest-api)

```bash
pnpm install
pnpm db:up
```

PostgreSQL se expone en el host en el puerto **5433** (contenedor 5432) para evitar conflicto con un Postgres local en 5432. ClickHouse queda en 8123/9000.

Verificá que ingest-api responda:

```bash
curl http://localhost:8080/health
```

### 2. Dashboard

```bash
cd apps/dashboard
cp .env.example .env   # si no existe
composer install
php artisan key:generate
php artisan migrate --seed
```

En dos terminales (o una con `composer dev`):

```bash
php artisan serve --host=127.0.0.1 --port=8001
npm install && npm run dev
```

Abrí **http://127.0.0.1:8001** e iniciá sesión:

| Campo | Valor |
| --- | --- |
| Email | `admin@seeyou.test` |
| Password | `password` |

### 3. Probar ingesta

```bash
curl -X POST http://localhost:8080/track \
  -H "Content-Type: application/json" \
  -d "{
    \"type\": \"event\",
    \"timestamp\": $(date +%s000),
    \"payload\": {
      \"event_type\": \"custom\",
      \"event_name\": \"hello_seeyou\",
      \"url\": \"https://example.com/\"
    }
  }"
```

Respuesta esperada: `{"status":"accepted","count":1}`. El evento aparece en **Logs** del dashboard.

## SDK en tu frontend

```ts
import { SeeYou } from '@seeyou/sdk'

SeeYou.init({
  endpoint: 'http://localhost:8080/track',
  // trackWebVitals: true,  // opcional, default false
})

SeeYou.captureException(error)
SeeYou.captureEvent('checkout_started', { plan: 'pro' })
```

Más detalle en [`apps/sdk-js/README.md`](apps/sdk-js/README.md).

## Puertos en local

| Servicio | Puerto | Uso |
| --- | --- | --- |
| ingest-api | 8080 | `POST /track`, `GET /health` |
| ClickHouse HTTP | 8123 | Queries / consola web |
| ClickHouse nativo | 9000 | Driver Go |
| PostgreSQL | 5433 | Dashboard (host; evita conflicto con Postgres local en 5432) |
| Laravel | 8001 | Dashboard (dev) |
| Vite | 5173 | HMR del frontend |

## Scripts útiles

```bash
pnpm db:up       # Levantar Docker
pnpm db:down     # Bajar Docker
pnpm db:reset    # Reset total de volúmenes
pnpm build       # Build de todas las apps (Turbo)
pnpm test        # Tests de todas las apps
pnpm dev         # Dev servers de todas las apps (Turbo)
```

## Documentación adicional

- [`dev-commands.md`](dev-commands.md) — comandos de desarrollo, ClickHouse, troubleshooting
- [`architecture.md`](architecture.md) — referencia extendida de arquitectura
- [`docs/aws-deployment.md`](docs/aws-deployment.md) — deploy en AWS (EC2 self-hosted)
- [`apps/sdk-js/README.md`](apps/sdk-js/README.md) — API del SDK

## Licencia

Open source. Ver licencias individuales de cada app.
