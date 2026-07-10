export type TrackType = 'error' | 'web_vital' | 'event'

export type VitalName = 'LCP' | 'INP' | 'CLS' | 'TTFB' | 'FCP'
export type VitalRating = 'good' | 'needs-improvement' | 'poor'

export interface SeeYouConfig {
  /** Full URL to ingest-api POST /track */
  endpoint: string
  /** 0–1; events below the roll are dropped. Default 1. */
  sampleRate?: number
  userId?: string
  /** Subscribe to LCP, INP, CLS, TTFB, FCP. Default false. */
  trackWebVitals?: boolean
}

export interface TrackPayload {
  type: TrackType
  timestamp: number
  payload: Record<string, unknown>
}

export interface ErrorPayload {
  message: string
  stack_trace: string
  error_type: string
  url: string
  referrer: string
  session_id: string
  user_id?: string
  user_agent: string
  extra?: Record<string, unknown>
}

export interface WebVitalPayload {
  metric_name: VitalName
  metric_value: number
  rating: VitalRating
  url: string
  navigation_type: string
  session_id: string
  user_id?: string
  user_agent: string
  connection_type?: string
}

export interface EventPayload {
  event_type: string
  event_name: string
  url: string
  session_id: string
  user_id?: string
  properties?: Record<string, unknown>
}
