// One message for every device that does not start: what is not available, then why —
// phrased as what the user can do about it. Shared by the prejoin and the call.
const REASONS = {
  NotAllowedError: 'denied',
  SecurityError: 'denied',
  NotFoundError: 'noDevice',
  OverconstrainedError: 'noDevice',
  NotReadableError: 'busy',
  // Firefox's word for a device that is there but does not start ("Starting videoinput failed").
  AbortError: 'busy',
}

export const deviceErrorMessage = ($t, kind, err) => {
  const key = REASONS[err && err.name]
  if (!key && err) {
    // The browser's own text is neither translated nor meant for the user, but worth keeping.
    // eslint-disable-next-line no-console
    console.warn(`VideoCall: ${kind} did not start`, err)
  }
  return `${$t(`videoCall.errors.${kind}.unavailable`)} ${$t(`videoCall.errors.reason.${key || 'generic'}`)}`
}
