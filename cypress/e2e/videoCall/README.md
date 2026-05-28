# Video-call e2e (Tier B: fake devices, no LiveKit server)

What these specs cover:
- The video-call button only renders for public-group members with
  `videoCallConfig.enabled === true`.
- The PreJoin dialog opens/cancels correctly and the mic / camera toggles
  flip the UI state.
- Joining against the synthetic LiveKit URL configured in
  `docker-compose.test.yml` lands in the error phase, and the error block's
  "back to settings" button restores PreJoin.

What they do **not** cover:
- A real LiveKit room.connect() / WebRTC media exchange. There is no LiveKit
  server in the CI compose stack — that's tier C and would require shipping
  a `livekit/livekit-server` container plus multi-browser coordination.

How the browser plays along:
- `cypress.config.js` adds `--use-fake-ui-for-media-stream`,
  `--use-fake-device-for-media-stream`, and
  `--autoplay-policy=no-user-gesture-required` for the Chromium family
  (including the bundled Electron). That gives `getUserMedia` /
  `enumerateDevices` synthetic devices to enumerate, lets the AudioContext
  resume without a user gesture, and silences the permission prompt.

How the backend plays along:
- `docker-compose.test.yml` injects fake `LIVEKIT_URL` /
  `LIVEKIT_API_KEY` / `LIVEKIT_API_SECRET` so that `CONFIG.LIVEKIT_ENABLED`
  is true and `videoCallConfig.enabled` is reported as true.
- The synthetic URL is never reachable, which is intentional: it drives the
  client into the error-phase test scenarios.
