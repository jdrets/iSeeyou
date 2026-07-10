-- =========================================================
-- Migración: eliminar project_id (instalaciones existentes)
-- Ejecutar manualmente si ya tenías tablas con el schema anterior:
--   docker exec -i seeyou_clickhouse clickhouse-client \
--     --user seeyou --password seeyou_secret --multiquery < infra/clickhouse/init/002_remove_project_id.sql
-- =========================================================

DROP TABLE IF EXISTS seeyou.errors;
DROP TABLE IF EXISTS seeyou.web_vitals;
DROP TABLE IF EXISTS seeyou.events;

-- Recrear con schema sin project_id (mismo contenido que 001_create_tables.sql)

CREATE TABLE seeyou.errors
(
    event_id      UUID          DEFAULT generateUUIDv4(),
    timestamp     DateTime64(3) DEFAULT now64(),
    date          Date          MATERIALIZED toDate(timestamp),
    message       String,
    stack_trace   String,
    error_type    LowCardinality(String),
    url           String,
    referrer      String,
    session_id    String,
    user_id       String,
    user_agent    String,
    browser       LowCardinality(String),
    os            LowCardinality(String),
    extra         String DEFAULT '{}'
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(date)
ORDER BY (date, timestamp)
TTL date + INTERVAL 90 DAY
SETTINGS index_granularity = 8192;

CREATE TABLE seeyou.web_vitals
(
    event_id      UUID          DEFAULT generateUUIDv4(),
    timestamp     DateTime64(3) DEFAULT now64(),
    date          Date          MATERIALIZED toDate(timestamp),
    metric_name   LowCardinality(String),
    metric_value  Float64,
    rating        LowCardinality(String),
    url           String,
    navigation_type LowCardinality(String),
    session_id    String,
    user_id       String,
    user_agent    String,
    connection_type LowCardinality(String)
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(date)
ORDER BY (date, metric_name, timestamp)
TTL date + INTERVAL 90 DAY
SETTINGS index_granularity = 8192;

CREATE TABLE seeyou.events
(
    event_id      UUID          DEFAULT generateUUIDv4(),
    timestamp     DateTime64(3) DEFAULT now64(),
    date          Date          MATERIALIZED toDate(timestamp),
    event_type    LowCardinality(String),
    event_name    String,
    url           String,
    session_id    String,
    user_id       String,
    properties    String DEFAULT '{}'
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(date)
ORDER BY (date, event_type, timestamp)
TTL date + INTERVAL 90 DAY
SETTINGS index_granularity = 8192;
