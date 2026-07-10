import { onCLS, onFCP, onINP, onLCP, onTTFB, type Metric } from 'web-vitals'
import type { VitalName, VitalRating, WebVitalPayload } from '../types'

type TrackVitalFn = (
  partial: Omit<
    WebVitalPayload,
    'url' | 'session_id' | 'user_agent' | 'user_id' | 'connection_type'
  >,
) => void

function toRating(rating: Metric['rating']): VitalRating {
  if (rating === 'good' || rating === 'needs-improvement' || rating === 'poor') {
    return rating
  }
  return 'needs-improvement'
}

function navigationType(): string {
  try {
    const entry = performance.getEntriesByType('navigation')[0] as
      | PerformanceNavigationTiming
      | undefined
    return entry?.type ?? 'navigate'
  } catch {
    return 'navigate'
  }
}

function report(trackVital: TrackVitalFn, metric: Metric): void {
  trackVital({
    metric_name: metric.name as VitalName,
    metric_value: metric.value,
    rating: toRating(metric.rating),
    navigation_type: navigationType(),
  })
}

/** Subscribe to Core Web Vitals (bundled web-vitals). */
export function attachVitalListeners(trackVital: TrackVitalFn): void {
  if (typeof window === 'undefined') return

  const send = (metric: Metric) => report(trackVital, metric)
  onLCP(send)
  onINP(send)
  onCLS(send)
  onTTFB(send)
  onFCP(send)
}
