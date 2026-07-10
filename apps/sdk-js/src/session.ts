const SESSION_KEY = 'seeyou_sid'

function uuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  // Fallback for older browsers (ES2017 target).
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

/** Returns a stable session id for the current browser tab. */
export function getSessionId(): string {
  try {
    const existing = sessionStorage.getItem(SESSION_KEY)
    if (existing) return existing
    const id = uuid()
    sessionStorage.setItem(SESSION_KEY, id)
    return id
  } catch {
    return uuid()
  }
}
