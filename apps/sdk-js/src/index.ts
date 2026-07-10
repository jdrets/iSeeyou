import {
  init,
  captureException,
  captureEvent,
  setUser,
} from './init'

export type {
  ISeeYouConfig,
  TrackPayload,
  ErrorPayload,
  WebVitalPayload,
  EventPayload,
  TrackType,
  VitalName,
  VitalRating,
} from './types'

export { init, captureException, captureEvent, setUser }

/** Public SDK surface — IIFE global is also `ISeeYou` (methods hang off it). */
export const ISeeYou = {
  init,
  captureException,
  captureEvent,
  setUser,
}
