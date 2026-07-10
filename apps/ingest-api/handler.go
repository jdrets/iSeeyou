package main

import (
	"encoding/json"
	"io"
	"log"
	"net/http"
	"time"

	"github.com/ClickHouse/clickhouse-go/v2"
)

const maxBodyBytes = 64 << 10 // 64 KB
const maxBatchSize = 100

// healthHandler responde GET /health — lo usan Docker, load balancers y el dashboard
// para saber si la API está viva.
func healthHandler(w http.ResponseWriter, _ *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
}

// setCORSHeaders permite que el SDK browser envíe POST /track desde cualquier origin.
// Self-hosted single-tenant: * es suficiente para v1.
func setCORSHeaders(w http.ResponseWriter) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
}

// trackOptionsHandler responde el preflight CORS del browser.
func trackOptionsHandler(w http.ResponseWriter, _ *http.Request) {
	setCORSHeaders(w)
	w.WriteHeader(http.StatusNoContent)
}

// parseTrackBody acepta un evento suelto o un batch { "events": [ ... ] }.
func parseTrackBody(r *http.Request) ([]TrackPayload, error) {
	body, err := io.ReadAll(io.LimitReader(r.Body, maxBodyBytes+1))
	if err != nil {
		return nil, err
	}
	if len(body) > maxBodyBytes {
		return nil, errBodyTooLarge
	}

	var batch struct {
		Events []TrackPayload `json:"events"`
	}
	if err := json.Unmarshal(body, &batch); err == nil && batch.Events != nil {
		return batch.Events, nil
	}

	var single TrackPayload
	if err := json.Unmarshal(body, &single); err != nil {
		return nil, err
	}
	return []TrackPayload{single}, nil
}

var errBodyTooLarge = &bodyTooLargeError{}

type bodyTooLargeError struct{}

func (e *bodyTooLargeError) Error() string { return "body too large" }

// trackHandler retorna un http.HandlerFunc que cierra sobre la conexión db.
func trackHandler(db clickhouse.Conn) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		setCORSHeaders(w)

		events, err := parseTrackBody(r)
		if err != nil {
			if err == errBodyTooLarge {
				writeError(w, http.StatusRequestEntityTooLarge, "body too large")
				return
			}
			writeError(w, http.StatusBadRequest, "invalid json body")
			return
		}

		if len(events) == 0 {
			writeError(w, http.StatusBadRequest, "events must not be empty")
			return
		}
		if len(events) > maxBatchSize {
			writeError(w, http.StatusBadRequest, "batch too large")
			return
		}

		now := time.Now().UnixMilli()
		for i := range events {
			p := &events[i]
			if p.Type == "" {
				writeError(w, http.StatusBadRequest, "type is required")
				return
			}
			switch p.Type {
			case "error", "web_vital", "event":
			default:
				writeError(w, http.StatusBadRequest, "type must be 'error', 'web_vital' or 'event'")
				return
			}
			if p.Timestamp <= 0 {
				p.Timestamp = now
			}
		}

		for _, p := range events {
			var insertErr error
			switch p.Type {
			case "error":
				insertErr = insertError(r.Context(), db, p)
			case "web_vital":
				insertErr = insertWebVital(r.Context(), db, p)
			case "event":
				insertErr = insertEvent(r.Context(), db, p)
			}
			if insertErr != nil {
				log.Printf("[ERROR] insert %s: %v", p.Type, insertErr)
				writeError(w, http.StatusInternalServerError, "storage failure")
				return
			}
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusAccepted)
		json.NewEncoder(w).Encode(map[string]any{
			"status": "accepted",
			"count":  len(events),
		})
	}
}

// writeError escribe una respuesta JSON de error de forma consistente.
func writeError(w http.ResponseWriter, code int, msg string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	json.NewEncoder(w).Encode(map[string]string{"error": msg})
}
