type TrackErrorFn = (partial: {
  message: string
  stack_trace: string
  error_type: string
  extra?: Record<string, unknown>
}) => void

/** Attach window error + unhandledrejection listeners. */
export function attachErrorListeners(trackError: TrackErrorFn): void {
  if (typeof window === 'undefined') return

  window.addEventListener('error', (event) => {
    const err = event.error
    if (err instanceof Error) {
      trackError({
        message: err.message || event.message || 'Error',
        stack_trace: err.stack || '',
        error_type: err.name || 'Error',
      })
      return
    }
    trackError({
      message: event.message || 'Error',
      stack_trace: '',
      error_type: 'Error',
      extra: {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      },
    })
  })

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason
    if (reason instanceof Error) {
      trackError({
        message: reason.message || 'UnhandledRejection',
        stack_trace: reason.stack || '',
        error_type: reason.name || 'UnhandledRejection',
      })
      return
    }
    trackError({
      message: typeof reason === 'string' ? reason : 'UnhandledRejection',
      stack_trace: '',
      error_type: 'UnhandledRejection',
      extra: reason !== undefined ? { reason } : undefined,
    })
  })
}
