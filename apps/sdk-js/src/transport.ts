import type { TrackPayload } from './types'

const MAX_QUEUE = 32

export type Sender = (endpoint: string, body: string) => boolean

/** Prefer sendBeacon; fall back to keepalive fetch. Returns true if a send was attempted. */
export function defaultSend(endpoint: string, body: string): boolean {
  const blob = new Blob([body], { type: 'application/json' })

  if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
    try {
      if (navigator.sendBeacon(endpoint, blob)) return true
    } catch {
      // fall through to fetch
    }
  }

  if (typeof fetch === 'function') {
    void fetch(endpoint, {
      method: 'POST',
      body,
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
      mode: 'cors',
    }).catch(() => {
      /* fire-and-forget */
    })
    return true
  }

  return false
}

export class Transport {
  private queue: TrackPayload[] = []
  private scheduled = false
  private endpoint = ''
  private send: Sender

  constructor(send: Sender = defaultSend) {
    this.send = send
  }

  setEndpoint(endpoint: string): void {
    this.endpoint = endpoint
  }

  enqueue(payload: TrackPayload): void {
    if (!this.endpoint) return
    if (this.queue.length >= MAX_QUEUE) this.queue.shift()
    this.queue.push(payload)
    this.scheduleFlush()
  }

  /** Drain immediately (tests / pagehide). One POST with { events: [...] }. */
  flush(): void {
    this.scheduled = false
    if (!this.endpoint || this.queue.length === 0) return

    const batch = this.queue.splice(0, this.queue.length)
    this.send(this.endpoint, JSON.stringify({ events: batch }))
  }

  private scheduleFlush(): void {
    if (this.scheduled) return
    this.scheduled = true

    const run = () => this.flush()

    if (typeof requestIdleCallback === 'function') {
      requestIdleCallback(run, { timeout: 1000 })
    } else {
      setTimeout(run, 0)
    }
  }
}
