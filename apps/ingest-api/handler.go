package main

import (
	"encoding/json"
	"log"
	"net/http"
	"time"

	"github.com/ClickHouse/clickhouse-go/v2"
)

// healthHandler responde GET /health — lo usan Docker, load balancers y el dashboard
// para saber si la API está viva.
func healthHandler(w http.ResponseWriter, _ *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
}

// trackHandler retorna un http.HandlerFunc que cierra sobre la conexión db.
// Esta es la razón por la que la función recibe db y retorna otra función:
// el mux de Go solo acepta handlers sin argumentos extra, así que los
// "inyectamos" vía closure.
func trackHandler(db clickhouse.Conn) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// 1. Decodificar el JSON del body en un TrackPayload.
		var p TrackPayload
		if err := json.NewDecoder(r.Body).Decode(&p); err != nil {
			writeError(w, http.StatusBadRequest, "invalid json body")
			return
		}

		// 2. Validar campos obligatorios y normalizar timestamp.
		if p.Type == "" {
			writeError(w, http.StatusBadRequest, "type is required")
			return
		}
		if p.Timestamp <= 0 {
			p.Timestamp = time.Now().UnixMilli()
		}

		// 3. Delegar la inserción según el tipo de evento.
		var insertErr error
		switch p.Type {
		case "error":
			insertErr = insertError(r.Context(), db, p)
		case "web_vital":
			insertErr = insertWebVital(r.Context(), db, p)
		case "event":
			insertErr = insertEvent(r.Context(), db, p)
		default:
			writeError(w, http.StatusBadRequest, "type must be 'error', 'web_vital' or 'event'")
			return
		}

		if insertErr != nil {
			// Logueamos el error interno pero nunca lo exponemos al cliente.
			log.Printf("[ERROR] insert %s: %v", p.Type, insertErr)
			writeError(w, http.StatusInternalServerError, "storage failure")
			return
		}

		// 4. 202 Accepted — el dato fue recibido y encolado.
		// Usamos 202 (no 200) porque con async inserts no garantizamos durabilidad
		// inmediata: ClickHouse puede tardar ~200ms en escribirlo a disco en batch.
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusAccepted)
		json.NewEncoder(w).Encode(map[string]string{"status": "accepted"})
	}
}

// writeError escribe una respuesta JSON de error de forma consistente.
func writeError(w http.ResponseWriter, code int, msg string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	json.NewEncoder(w).Encode(map[string]string{"error": msg})
}
