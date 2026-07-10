package main

import (
	"log"
	"net/http"
)

func main() {
	// 1. Abrir conexión con ClickHouse.
	// Si no puede conectar (ej: ClickHouse no está levantado), el programa termina
	// con log.Fatalf — en Go, los errores críticos de inicio son fatales.
	db, err := newDB()
	if err != nil {
		log.Fatalf("cannot connect to ClickHouse: %v", err)
	}
	defer db.Close()

	// 2. Registrar rutas en el multiplexor (router) estándar de Go.
	// Desde Go 1.22 el mux soporta "METHOD /path" directamente.
	mux := http.NewServeMux()
	mux.HandleFunc("GET /health", healthHandler)
	mux.HandleFunc("POST /track", trackHandler(db))

	// 3. Arrancar el servidor HTTP.
	addr := getEnv("HTTP_ADDR", ":8080")
	log.Printf("ingest-api listening on %s", addr)

	// ListenAndServe bloquea para siempre (o hasta que el proceso muere).
	if err := http.ListenAndServe(addr, mux); err != nil {
		log.Fatalf("server error: %v", err)
	}
}
