# Video Call

The group video call of the webapp, built on [LiveKit](https://livekit.io/): the prejoin dialog (`PreJoin.vue`), the call itself (`VideoCall.vue`) with its tiles, controls, device settings, participant list and conference chat.

The end-to-end tests of the prejoin are described in [cypress/e2e/videoCall/README.md](../../../cypress/e2e/videoCall/README.md).

## Testing

### Devices that are missing or busy

A camera or microphone that is not there, or there but busy (used by another application) or broken, is hard to bring about on a machine that has working ones. This snippet makes the browser behave as if it were so, without changing any code.

Paste it into the browser console of the app's tab **before** opening the prejoin. Set the camera and the microphone each to `'ok'`, `'none'` or `'busy'`. It lasts until the page is reloaded; navigating inside the app keeps it. For another combination, reload, change the two values and paste it again.

LiveKit takes the devices through `navigator.mediaDevices.getUserMedia` too, so it holds for the prejoin and for the call alike.

```js
;(() => {
  // Per device: 'ok' = as it is, 'none' = not there, 'busy' = there, but busy or broken
  const camera = 'busy'
  const mic = 'none'

  const modes = { video: camera, audio: mic }
  const kinds = { video: 'videoinput', audio: 'audioinput' }
  const md = navigator.mediaDevices
  const enumerate = md.enumerateDevices.bind(md)
  const getUserMedia = md.getUserMedia.bind(md)

  md.enumerateDevices = async () => {
    const list = await enumerate()
    return list.filter((d) =>
      Object.keys(kinds).every((k) => !(modes[k] === 'none' && d.kind === kinds[k])),
    )
  }

  md.getUserMedia = async (constraints = {}) => {
    // As the browser does: one device asked for that fails, fails the whole request.
    for (const k of ['video', 'audio']) {
      if (!constraints[k]) continue
      if (modes[k] === 'none') {
        throw new DOMException('Requested device not found', 'NotFoundError')
      }
      if (modes[k] === 'busy') {
        throw new DOMException(`Could not start ${k} source`, 'NotReadableError')
      }
    }
    return getUserMedia(constraints)
  }

  console.log(`Device mock active: camera ${camera}, microphone ${mic}`)
})()
```

What to expect:

- **`none`:** the device's field shows "No device detected", its badge "Not found" and the line below it says so; its toggle is off. Joining works with the other device.
- **`busy`:** the device is listed; its badge says "Busy", the line below its field that another application uses it, and its toggle is off.
- **In the call:** the device settings name a device that did not start, in the prejoin or in the call, and offer a retry. Switched on in the call, it fails again with a toast.
- **No second self:** let a join fail (a LiveKit URL wrong for a moment, say), then "Change settings" and join again, or click "Retry" twice quickly — the participant list shows you once.
