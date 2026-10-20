// One message for every device that does not start: what is not available, then why —
// phrased as what the user can do about it. Shared by the prejoin and the call.
const REASONS = {
  NotAllowedError: 'denied',
  SecurityError: 'denied',
  NotFoundError: 'noDevice',
  OverconstrainedError: 'noDevice',
  NotReadableError: 'busy',
}

export const deviceErrorMessage = ($t, kind, err) => {
  const key = REASONS[err && err.name]
  const reason = key
    ? $t(`videoCall.errors.reason.${key}`)
    : (err && err.message) || $t('videoCall.errors.reason.generic')
  return `${$t(`videoCall.errors.${kind}.unavailable`)} ${reason}`
}
