-- =========================================================
-- SeeYou — Schema inicial de ClickHouse
-- Motor: MergeTree con particionado por fecha
-- =========================================================

CREATE DATABASE IF NOT EXISTS seeyou;

-- ─────────────────────────────────────────────────────────
-- Tabla de eventos de error (window.onerror / unhandledrejection)
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS seeyou.errors
(
    project_id    UUID,
    event_id      UUID          DEFAULT generateUUIDv4(),
    timestamp     DateTime64(3) DEFAULT now64(),
    date          Date          MATERIALIZED toDate(timestamp),

    -- Contexto del error
    message       String,
    stack_trace   String,
    error_type    LowCardinality(String),

    -- Contexto de la página
    url           String,
    referrer      String,

    -- Contexto del usuario / sesión
    session_id    String,
    user_id       String,

    -- Contexto del browser
    user_agent    String,
    browser       LowCardinality(String),
    os            LowCardinality(String),

    -- Metadatos extra como JSON arbitrario
    extra         String DEFAULT '{}'
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(date)
ORDER BY (project_id, date, timestamp)
TTL date + INTERVAL 90 DAY
SETTINGS index_granularity = 8192;


-- ─────────────────────────────────────────────────────────
-- Tabla de Core Web Vitals (LCP, FID/INP, CLS, TTFB, FCP)
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS seeyou.web_vitals
(
    project_id    UUID,
    event_id      UUID          DEFAULT generateUUIDv4(),
    timestamp     DateTime64(3) DEFAULT now64(),
    date          Date          MATERIALIZED toDate(timestamp),

    -- Métrica
    metric_name   LowCardinality(String), -- LCP, INP, CLS, TTFB, FCP
    metric_value  Float64,
    rating        LowCardinality(String), -- good | needs-improvement | poor

    -- Contexto de navegación
    url           String,
    navigation_type LowCardinality(String), -- navigate | reload | back_forward

    -- Contexto de sesión
    session_id    String,
    user_id       String,

    -- Browser
    user_agent    String,
    connection_type LowCardinality(String)
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(date)
ORDER BY (project_id, date, metric_name, timestamp)
TTL date + INTERVAL 90 DAY
SETTINGS index_granularity = 8192;


-- ─────────────────────────────────────────────────────────
-- Tabla de eventos de usuario genéricos (clicks, page views, etc.)
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS seeyou.events
(
    project_id    UUID,
    event_id      UUID          DEFAULT generateUUIDv4(),
    timestamp     DateTime64(3) DEFAULT now64(),
    date          Date          MATERIALIZED toDate(timestamp),

    event_type    LowCardinality(String), -- page_view | click | custom | ...
    event_name    String,

    url           String,
    session_id    String,
    user_id       String,

    properties    String DEFAULT '{}'
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(date)
ORDER BY (project_id, date, event_type, timestamp)
TTL date + INTERVAL 90 DAY
SETTINGS index_granularity = 8192;
