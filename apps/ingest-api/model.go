package main

import "encoding/json"

// TrackPayload es el cuerpo JSON que llega en POST /track desde el SDK.
// El campo Payload es flexible (map) porque su contenido varía según el Type.
type TrackPayload struct {
	Type      string         `json:"type"`      // "error" | "web_vital" | "event"
	Timestamp int64          `json:"timestamp"`  // momento del evento en Unix milisegundos
	Payload   map[string]any `json:"payload"`    // datos específicos del tipo
}

// str extrae un string de Payload por clave; retorna def si no existe o no es string.
func (p TrackPayload) str(key, def string) string {
	if v, ok := p.Payload[key]; ok {
		if s, ok := v.(string); ok {
			return s
		}
	}
	return def
}

// f64 extrae un número de Payload; los números JSON siempre llegan como float64 en Go.
func (p TrackPayload) f64(key string, def float64) float64 {
	if v, ok := p.Payload[key]; ok {
		if n, ok := v.(float64); ok {
			return n
		}
	}
	return def
}

// payloadJSON serializa todo el Payload a un string JSON para guardarlo en ClickHouse.
func (p TrackPayload) payloadJSON() string {
	b, _ := json.Marshal(p.Payload)
	return string(b)
}
