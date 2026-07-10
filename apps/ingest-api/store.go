package main

import (
	"context"
	"fmt"
	"os"
	"time"

	"github.com/ClickHouse/clickhouse-go/v2"
)

// newDB abre la conexión con ClickHouse y verifica que responda con Ping.
// En Go, los errores se retornan como valores — no hay excepciones.
func newDB() (clickhouse.Conn, error) {
	addr := getEnv("CLICKHOUSE_ADDR", "localhost:9000")

	// clickhouse.Open configura la conexión pero NO la abre todavía.
	// La conexión real ocurre en el primer Ping o query.
	conn, err := clickhouse.Open(&clickhouse.Options{
		Addr: []string{addr},
		Auth: clickhouse.Auth{
			Database: getEnv("CLICKHOUSE_DB", "seeyou"),
			Username: getEnv("CLICKHOUSE_USER", "seeyou"),
			Password: getEnv("CLICKHOUSE_PASSWORD", "seeyou_secret"),
		},
		// Estos settings sobreescriben los del servidor para esta conexión.
		// async_insert=1          → acumula filas antes de escribir (alto throughput).
		// wait_for_async_insert=0 → no esperar confirmación, retornar inmediatamente.
		Settings: clickhouse.Settings{
			"async_insert":          1,
			"wait_for_async_insert": 0,
		},
	})
	if err != nil {
		return nil, fmt.Errorf("open: %w", err)
	}

	// Ping con timeout de 5 segundos para validar que ClickHouse está accesible.
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := conn.Ping(ctx); err != nil {
		return nil, fmt.Errorf("ping: %w", err)
	}

	return conn, nil
}

// insertError guarda un evento de tipo "error" en la tabla errors de ClickHouse.
// Los ? son placeholders para evitar SQL injection — el driver los escapa.
func insertError(ctx context.Context, db clickhouse.Conn, p TrackPayload) error {
	return db.Exec(ctx, `
		INSERT INTO errors
			(timestamp, message, stack_trace, error_type, url, session_id, user_id, user_agent, extra)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		time.UnixMilli(p.Timestamp),
		p.str("message", ""),
		p.str("stack_trace", ""),
		p.str("error_type", "Error"),
		p.str("url", ""),
		p.str("session_id", ""),
		p.str("user_id", ""),
		p.str("user_agent", ""),
		p.payloadJSON(),
	)
}

// insertWebVital guarda una métrica de Core Web Vitals (LCP, CLS, INP, etc.).
func insertWebVital(ctx context.Context, db clickhouse.Conn, p TrackPayload) error {
	return db.Exec(ctx, `
		INSERT INTO web_vitals
			(timestamp, metric_name, metric_value, rating, url, navigation_type, session_id, user_id, user_agent, connection_type)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		time.UnixMilli(p.Timestamp),
		p.str("metric_name", ""),
		p.f64("metric_value", 0),
		p.str("rating", ""),
		p.str("url", ""),
		p.str("navigation_type", "navigate"),
		p.str("session_id", ""),
		p.str("user_id", ""),
		p.str("user_agent", ""),
		p.str("connection_type", ""),
	)
}

// insertEvent guarda un evento genérico de usuario (page_view, click, custom, etc.).
func insertEvent(ctx context.Context, db clickhouse.Conn, p TrackPayload) error {
	return db.Exec(ctx, `
		INSERT INTO events
			(timestamp, event_type, event_name, url, session_id, user_id, properties)
		VALUES (?, ?, ?, ?, ?, ?, ?)`,
		time.UnixMilli(p.Timestamp),
		p.str("event_type", "custom"),
		p.str("event_name", ""),
		p.str("url", ""),
		p.str("session_id", ""),
		p.str("user_id", ""),
		p.payloadJSON(),
	)
}

// getEnv lee una variable de entorno; si no existe retorna el valor por defecto.
func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
