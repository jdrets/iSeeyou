# SeeYou — Architecture Overview

## Purpose
SeeYou is an open-source, self-hosted frontend observability platform. It allows teams to install a lightweight SDK on their web applications to capture uncaught exceptions, user events, and Core Web Vitals in real time — without sending data to third-party services.

## System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   Client Browser                        │
│                                                         │
│   ┌─────────────────────────────────────────────────┐   │
│   │           apps/sdk-js  (< 5 KB gzip)            │   │
│   │  window.onerror · Web Vitals · Custom Events    │   │
│   └──────────────────────┬──────────────────────────┘   │
└─────────────────────────-│──────────────────────────────┘
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
│  TTL: 90 days                                           │
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

## Monorepo Structure

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
├── .cursor/
│   └── agents/          AI specialist agents
│       ├── orchestrator.md
│       ├── sdk-js-engineer.md
│       ├── ingest-api-engineer.md
│       ├── dashboard-backend-engineer.md
│       └── dashboard-frontend-engineer.md
├── docker-compose.yml   Local dev infrastructure
├── turbo.json           Turborepo pipeline config
├── pnpm-workspace.yaml  pnpm workspace definition
└── package.json         Root package with global scripts
```

## AI Agent Topology

| Agent | Scope | Tech |
|---|---|---|
| `orchestrator` | Cross-cutting decisions, contracts, infra | All stacks |
| `sdk-js-engineer` | `apps/sdk-js` | TypeScript, Web APIs, Rollup |
| `ingest-api-engineer` | `apps/ingest-api` | Go, ClickHouse, HTTP |
| `dashboard-backend-engineer` | `apps/dashboard` (server) | Laravel, PHP, PostgreSQL |
| `dashboard-frontend-engineer` | `apps/dashboard` (client) | React, Inertia.js, Tailwind |

## Local Development

### Prerequisites
- Docker + Docker Compose
- Node.js 20+
- pnpm 9+
- Go 1.23+
- PHP 8.3+ + Composer

### Start infrastructure
```bash
pnpm db:up
```

### Start all dev servers
```bash
pnpm dev
```

## Event Payload Contract

```json
{
  "type": "error | web_vital | event",
  "timestamp": 1720000000000,
  "payload": {}
}
```

See `.cursor/agents/sdk-js-engineer.md` for full payload schemas per event type.

## Infrastructure Requirements (Self-Hosted)

| Resource | Minimum | Recommended |
|---|---|---|
| CPU | 2 vCPU | 4 vCPU |
| RAM | 4 GB | 8 GB |
| Storage | 20 GB SSD | 100 GB SSD |
| OS | Ubuntu 22.04+ | Ubuntu 24.04 |
