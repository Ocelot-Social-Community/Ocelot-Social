// The camera, microphone and speaker a user picked by hand, kept in the browser so
// the next call starts on them. Only explicit choices are stored — whoever never
// touches the selection keeps following the browser's own default. The video
// quality is offered from here but not kept: it holds for one call only.
const STORAGE_KEY = 'ocelot-video-call-devices'

// 'auto' leaves the quality to the call: adaptive stream, dynacast and its reliefs.
export const SEND_QUALITIES = ['auto', 'high', 'medium', 'low']
// 'audio': no cameras at all, only the sound (and screen shares).
export const RECEIVE_QUALITIES = [...SEND_QUALITIES, 'audio']

export function loadDevicePreferences() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY))
    // An array is an object too, but what is set on it by name JSON leaves out.
    return stored && typeof stored === 'object' && !Array.isArray(stored) ? stored : {}
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
