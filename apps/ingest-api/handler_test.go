package main

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestParseTrackBodySingle(t *testing.T) {
	body := `{"type":"event","timestamp":1,"payload":{"event_name":"x"}}`
	r := httptest.NewRequest(http.MethodPost, "/track", strings.NewReader(body))
	events, err := parseTrackBody(r)
	if err != nil {
		t.Fatal(err)
	}
	if len(events) != 1 || events[0].Type != "event" {
		t.Fatalf("got %+v", events)
	}
}

func TestParseTrackBodyBatch(t *testing.T) {
	body := `{"events":[
		{"type":"error","timestamp":1,"payload":{"message":"a"}},
		{"type":"web_vital","timestamp":2,"payload":{"metric_name":"LCP"}}
	]}`
	r := httptest.NewRequest(http.MethodPost, "/track", strings.NewReader(body))
	events, err := parseTrackBody(r)
	if err != nil {
		t.Fatal(err)
	}
	if len(events) != 2 {
		t.Fatalf("want 2, got %d", len(events))
	}
	if events[0].Type != "error" || events[1].Type != "web_vital" {
		t.Fatalf("got %+v", events)
	}
}

func TestParseTrackBodyEmptyBatch(t *testing.T) {
	r := httptest.NewRequest(http.MethodPost, "/track", strings.NewReader(`{"events":[]}`))
	events, err := parseTrackBody(r)
	if err != nil {
		t.Fatal(err)
	}
	if len(events) != 0 {
		t.Fatalf("want empty, got %d", len(events))
	}
}

func TestTrackHandlerRejectsEmptyBatch(t *testing.T) {
	// db is unused when validation fails before insert
	h := trackHandler(nil)
	req := httptest.NewRequest(http.MethodPost, "/track", strings.NewReader(`{"events":[]}`))
	rr := httptest.NewRecorder()
	h(rr, req)
	if rr.Code != http.StatusBadRequest {
		t.Fatalf("status %d", rr.Code)
	}
	var resp map[string]string
	_ = json.NewDecoder(rr.Body).Decode(&resp)
	if resp["error"] != "events must not be empty" {
		t.Fatalf("resp %+v", resp)
	}
}

func TestTrackHandlerRejectsInvalidTypeInBatch(t *testing.T) {
	h := trackHandler(nil)
	body := `{"events":[{"type":"nope","timestamp":1,"payload":{}}]}`
	req := httptest.NewRequest(http.MethodPost, "/track", strings.NewReader(body))
	rr := httptest.NewRecorder()
	h(rr, req)
	if rr.Code != http.StatusBadRequest {
		t.Fatalf("status %d body %s", rr.Code, rr.Body.String())
	}
}
