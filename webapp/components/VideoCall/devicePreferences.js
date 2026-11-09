// The camera, microphone and speaker a user picked by hand, and the video quality
// they asked for, kept in the browser so the next call starts on them. Only
// explicit choices are stored — whoever never touches the selection keeps
// following the browser's own default, and the call's own judgement.
const STORAGE_KEY = 'ocelot-video-call-devices'

// 'auto' leaves the quality to the call: adaptive stream, dynacast and its reliefs.
export const SEND_QUALITIES = ['auto', 'high', 'medium', 'low']
// 'audio': no cameras at all, only the sound (and screen shares).
export const RECEIVE_QUALITIES = [...SEND_QUALITIES, 'audio']
const QUALITIES = { send: SEND_QUALITIES, receive: RECEIVE_QUALITIES }

export function loadDevicePreferences() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY))
    return stored && typeof stored === 'object' ? stored : {}
  } catch {
    // localStorage not available, or its content is not ours
    return {}
  }
}

function storePreferences(preferences) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences))
  } catch {
    // localStorage not available
  }
}

export function saveDevicePreference(kind, device) {
  if (!device || !device.deviceId) return
  const preferences = loadDevicePreferences()
  preferences[kind] = { deviceId: device.deviceId, label: device.label || '' }
  storePreferences(preferences)
}

// direction: 'send' or 'receive'. Anything stored that is not (or no longer) a
// choice on offer counts as none.
export function loadQualityPreference(direction) {
  const quality = loadDevicePreferences().quality
  const value = quality && quality[direction]
  return QUALITIES[direction].includes(value) ? value : 'auto'
}

export function saveQualityPreference(direction, value) {
  if (!QUALITIES[direction] || !QUALITIES[direction].includes(value)) return
  const preferences = loadDevicePreferences()
  const quality = { ...preferences.quality }
  // 'auto' is no choice: it is what a user who never chose gets.
  if (value === 'auto') delete quality[direction]
  else quality[direction] = value
  preferences.quality = quality
  storePreferences(preferences)
}

export function findPreferredDevice(devices, preference) {
  if (!preference) return null
  // Safari hands out new device ids with every session, so the id alone would
  // never match there again — the label is what stays.
  return (
    devices.find((d) => d.deviceId === preference.deviceId) ||
    (preference.label && devices.find((d) => d.label === preference.label)) ||
    null
  )
}
