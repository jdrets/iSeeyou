import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { Transport } from '../src/transport'
import type { TrackPayload } from '../src/types'
import {
  init,
  captureEvent,
  captureException,
  setUser,
  _resetForTests,
  _getTransport,
} from '../src/init'

const attachVitalListeners = vi.fn()

vi.mock('./listeners/vitals', () => ({
  attachVitalListeners,
}))

function parseBatch(body: string): TrackPayload[] {
  const parsed = JSON.parse(body) as { events: TrackPayload[] }
  return parsed.events
}

describe('Transport', () => {
  it('flushes queued payloads as one batch POST', () => {
    const sent: string[] = []
    const t = new Transport((endpoint, body) => {
      sent.push(`${endpoint}|${body}`)
      return true
    })
    t.setEndpoint('http://localhost:8080/track')

    const payload: TrackPayload = {
      type: 'event',
      timestamp: 1,
      payload: { event_name: 'x' },
    }
    t.enqueue(payload)
    t.flush()

    expect(sent).toHaveLength(1)
    expect(sent[0]).toContain('http://localhost:8080/track|')
    expect(parseBatch(sent[0]!.split('|')[1]!)).toEqual([payload])
  })

  it('batches multiple events into a single POST', () => {
    const sent: string[] = []
    const t = new Transport((_e, body) => {
      sent.push(body)
      return true
    })
    t.setEndpoint('http://x/track')

    t.enqueue({ type: 'event', timestamp: 1, payload: { event_name: 'a' } })
    t.enqueue({ type: 'error', timestamp: 2, payload: { message: 'b' } })
    t.flush()

    expect(sent).toHaveLength(1)
    const events = parseBatch(sent[0]!)
    expect(events).toHaveLength(2)
    expect(events[0]!.payload.event_name).toBe('a')
    expect(events[1]!.payload.message).toBe('b')
  })

  it('drops oldest when queue exceeds max', () => {
    const sent: string[] = []
    const t = new Transport((_e, body) => {
      sent.push(body)
      return true
    })
    t.setEndpoint('http://x/track')

    for (let i = 0; i < 40; i++) {
      t.enqueue({
        type: 'event',
        timestamp: i,
        payload: { event_name: String(i) },
      })
    }
    t.flush()

    expect(sent).toHaveLength(1)
    const events = parseBatch(sent[0]!)
    expect(events).toHaveLength(32)
    expect(events[0]!.timestamp).toBe(8)
  })
})

describe('SeeYou init + capture', () => {
  const sent: TrackPayload[] = []

  beforeEach(() => {
    sent.length = 0
    attachVitalListeners.mockClear()
    const t = new Transport((_endpoint, body) => {
      sent.push(...parseBatch(body))
      return true
    })
    _resetForTests(t)
  })

  afterEach(() => {
    _resetForTests()
  })

  it('requires endpoint', () => {
    expect(() => init({ endpoint: '' })).toThrow(/endpoint/)
  })

  it('sends captureEvent with envelope shape', () => {
    init({ endpoint: 'http://localhost:8080/track' })
    captureEvent('checkout_started', { plan: 'pro' })
    _getTransport()?.flush()

    expect(sent).toHaveLength(1)
    const item = sent[0]!
    expect(item.type).toBe('event')
    expect(item.timestamp).toBeGreaterThan(0)
    expect(item.payload.event_name).toBe('checkout_started')
    expect(item.payload.event_type).toBe('custom')
    expect(item.payload.properties).toEqual({ plan: 'pro' })
    expect(typeof item.payload.session_id).toBe('string')
    expect(typeof item.payload.url).toBe('string')
  })

  it('sends captureException from Error', () => {
    init({ endpoint: 'http://localhost:8080/track' })
    captureException(new TypeError('boom'), { route: '/a' })
    _getTransport()?.flush()

    expect(sent).toHaveLength(1)
    const item = sent[0]!
    expect(item.type).toBe('error')
    expect(item.payload.message).toBe('boom')
    expect(item.payload.error_type).toBe('TypeError')
    expect(item.payload.extra).toEqual({ route: '/a' })
  })

  it('respects sampleRate 0', () => {
    init({ endpoint: 'http://localhost:8080/track', sampleRate: 0 })
    captureEvent('never')
    _getTransport()?.flush()
    expect(sent).toHaveLength(0)
  })

  it('attaches user id from setUser', () => {
    init({ endpoint: 'http://localhost:8080/track' })
    setUser('user_42')
    captureEvent('with_user')
    _getTransport()?.flush()

    expect(sent[0]!.payload.user_id).toBe('user_42')
  })

  it('does not attach web vitals listeners by default', async () => {
    init({ endpoint: 'http://localhost:8080/track' })
    await Promise.resolve()
    expect(attachVitalListeners).not.toHaveBeenCalled()
  })

  it('attaches web vitals listeners when trackWebVitals is true', async () => {
    init({ endpoint: 'http://localhost:8080/track', trackWebVitals: true })
    await vi.waitFor(() => {
      expect(attachVitalListeners).toHaveBeenCalledTimes(1)
    })
  })
})
