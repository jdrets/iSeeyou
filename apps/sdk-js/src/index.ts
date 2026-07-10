import {
  init,
  captureException,
  captureEvent,
  setUser,
} from './init'

export type {
  SeeYouConfig,
  TrackPayload,
  ErrorPayload,
  WebVitalPayload,
  EventPayload,
  TrackType,
  VitalName,
  VitalRating,
} from './types'

export { init, captureException, captureEvent, setUser }

/** Public SDK surface — IIFE global is also `SeeYou` (methods hang off it). */
export const SeeYou = {
  init,
  captureException,
  captureEvent,
  setUser,
}
