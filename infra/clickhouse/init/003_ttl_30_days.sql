-- =========================================================
-- Migración: retención de 30 días (instalaciones existentes)
-- ClickHouse borra filas automáticamente en background; no hace falta cron.
-- Ejecutar si las tablas aún tienen TTL de 90 días:
--   docker exec -i iseeyou_clickhouse clickhouse-client \
--     --user iseeyou --password iseeyou_secret --multiquery \
--     < infra/clickhouse/init/003_ttl_30_days.sql
-- =========================================================

ALTER TABLE iseeyou.errors MODIFY TTL date + INTERVAL 30 DAY;
ALTER TABLE iseeyou.web_vitals MODIFY TTL date + INTERVAL 30 DAY;
ALTER TABLE iseeyou.events MODIFY TTL date + INTERVAL 30 DAY;

-- Aplicar el nuevo TTL de inmediato a datos ya almacenados (opcional pero recomendado).
ALTER TABLE iseeyou.errors MATERIALIZE TTL;
ALTER TABLE iseeyou.web_vitals MATERIALIZE TTL;
ALTER TABLE iseeyou.events MATERIALIZE TTL;
