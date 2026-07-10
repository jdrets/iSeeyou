-- =========================================================
-- Migración: retención de 30 días (instalaciones existentes)
-- ClickHouse borra filas automáticamente en background; no hace falta cron.
-- Ejecutar si las tablas aún tienen TTL de 90 días:
--   docker exec -i seeyou_clickhouse clickhouse-client \
--     --user seeyou --password seeyou_secret --multiquery \
--     < infra/clickhouse/init/003_ttl_30_days.sql
-- =========================================================

ALTER TABLE seeyou.errors MODIFY TTL date + INTERVAL 30 DAY;
ALTER TABLE seeyou.web_vitals MODIFY TTL date + INTERVAL 30 DAY;
ALTER TABLE seeyou.events MODIFY TTL date + INTERVAL 30 DAY;

-- Aplicar el nuevo TTL de inmediato a datos ya almacenados (opcional pero recomendado).
ALTER TABLE seeyou.errors MATERIALIZE TTL;
ALTER TABLE seeyou.web_vitals MATERIALIZE TTL;
ALTER TABLE seeyou.events MATERIALIZE TTL;
