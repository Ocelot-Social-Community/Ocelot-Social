// The camera, microphone and speaker a user picked by hand, kept in the browser
// so the next call starts on them. Only explicit choices are stored — whoever
// never touches the selection keeps following the browser's own default.
const STORAGE_KEY = 'ocelot-video-call-devices'

export function loadDevicePreferences() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY))
    return stored && typeof stored === 'object' ? stored : {}
  } catch {
    // localStorage not available, or its content is not ours
    return {}
  }
}

export function saveDevicePreference(kind, device) {
  if (!device || !device.deviceId) return
  const preferences = loadDevicePreferences()
  preferences[kind] = { deviceId: device.deviceId, label: device.label || '' }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences))
  } catch {
    // localStorage not available
  }
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
