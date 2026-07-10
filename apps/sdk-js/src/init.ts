import { getSessionId } from './session'
import { Transport } from './transport'
import type {
  ErrorPayload,
  EventPayload,
  ISeeYouConfig,
  TrackPayload,
  WebVitalPayload,
} from './types'
import { attachErrorListeners } from './listeners/errors'

let config: ISeeYouConfig | null = null
let userId: string | undefined
let transport: Transport | null = null
let initialized = false

function shouldSample(): boolean {
  const rate = config?.sampleRate ?? 1
  if (rate >= 1) return true
  if (rate <= 0) return false
  return Math.random() < rate
}

function pageUrl(): string {
  return typeof location !== 'undefined' ? location.href : ''
}

function userAgent(): string {
  return typeof navigator !== 'undefined' ? navigator.userAgent : ''
}

function connectionType(): string | undefined {
  const nav = navigator as Navigator & {
    connection?: { effectiveType?: string }
  }
  return nav.connection?.effectiveType
}

function track(type: TrackPayload['type'], payload: Record<string, unknown>): void {
  if (!config || !transport || !shouldSample()) return
  transport.enqueue({
    type,
    timestamp: Date.now(),
    payload,
  })
}

function baseContext(): { url: string; session_id: string; user_agent: string; user_id?: string } {
  const ctx: {
    url: string
    session_id: string
    user_agent: string
    user_id?: string
  } = {
    url: pageUrl(),
    session_id: getSessionId(),
    user_agent: userAgent(),
  }
  if (userId) ctx.user_id = userId
  return ctx
}

export function trackError(partial: Omit<ErrorPayload, 'url' | 'session_id' | 'user_agent' | 'user_id' | 'referrer'> & {
  referrer?: string
  extra?: Record<string, unknown>
}): void {
  const payload: ErrorPayload = {
    ...partial,
    ...baseContext(),
    referrer:
      partial.referrer ??
      (typeof document !== 'undefined' ? document.referrer : ''),
  }
  // ingest-api stores the whole payload JSON in `extra`; keep referrer there too.
  if (partial.extra) payload.extra = partial.extra
  track('error', payload as unknown as Record<string, unknown>)
}

export function trackVital(partial: Omit<WebVitalPayload, 'url' | 'session_id' | 'user_agent' | 'user_id' | 'connection_type'>): void {
  const payload: WebVitalPayload = {
    ...partial,
    ...baseContext(),
    connection_type: connectionType(),
  }
  track('web_vital', payload as unknown as Record<string, unknown>)
}

export function trackEvent(partial: Omit<EventPayload, 'url' | 'session_id' | 'user_id'>): void {
  const payload: EventPayload = {
    ...partial,
    ...baseContext(),
  }
  track('event', payload as unknown as Record<string, unknown>)
}

function onPageHide(): void {
  transport?.flush()
}

function maybeAttachVitalListeners(): void {
  if (!config?.trackWebVitals || typeof window === 'undefined') return

  // ponytail: lazy-load web-vitals only when enabled — keeps default bundle smaller.
  void import('./listeners/vitals').then(({ attachVitalListeners }) => {
    attachVitalListeners(trackVital)
  })
}

/** Initialize the SDK once. Subsequent calls update config only. */
export function init(options: ISeeYouConfig): void {
  if (!options?.endpoint) {
    throw new Error('ISeeYou.init: endpoint is required')
  }

  config = {
    endpoint: options.endpoint,
    sampleRate: options.sampleRate ?? 1,
    userId: options.userId,
    trackWebVitals: options.trackWebVitals ?? false,
  }
  userId = options.userId

  if (!transport) transport = new Transport()
  transport.setEndpoint(config.endpoint)

  if (initialized) return
  initialized = true

  attachErrorListeners(trackError)
  maybeAttachVitalListeners()

  if (typeof window !== 'undefined') {
    window.addEventListener('pagehide', onPageHide)
    window.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') transport?.flush()
    })
  }
}

export function captureException(
  error: Error | string,
  extra?: Record<string, unknown>,
): void {
  if (typeof error === 'string') {
    trackError({
      message: error,
      stack_trace: '',
      error_type: 'Error',
      extra,
    })
    return
  }
  trackError({
    message: error.message || String(error),
    stack_trace: error.stack || '',
    error_type: error.name || 'Error',
    extra,
  })
}

export function captureEvent(
  name: string,
  properties?: Record<string, unknown>,
): void {
  trackEvent({
    event_type: 'custom',
    event_name: name,
    properties,
  })
}

export function setUser(id: string | null): void {
  userId = id ?? undefined
  if (config) config.userId = userId
}

/** Test helpers — not part of the public surface docs. */
export function _resetForTests(t?: Transport): void {
  config = null
  userId = undefined
  transport = t ?? null
  initialized = false
}

export function _getTransport(): Transport | null {
  return transport
}
