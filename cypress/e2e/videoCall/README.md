# Video-call e2e (PreJoin only, no LiveKit connect)

What these specs cover:
- The video-call button only renders for public-group members with
  `videoCallConfig.enabled === true`.
- The PreJoin dialog opens / cancels correctly.
- The mic and camera toggles flip the UI state.

What they do **not** cover:
- A real LiveKit `room.connect()` / WebRTC media exchange.
- The error-block / Retry / Back-to-PreJoin paths. Those used to live here
  but depended on the backend returning an *unreachable* LiveKit URL.
  Locally the URL comes from `backend/.env` and may point at a real LiveKit
  instance, so the connect call succeeds and the error block never renders.
  Reintroduce these scenarios only when we can stub the
  `joinGroupVideoCall` GraphQL response (e.g. via `cy.intercept`) so the
  test fully owns the failure condition.

How the browser plays along:
- `cypress.config.js` adds `--use-fake-ui-for-media-stream`,
  `--use-fake-device-for-media-stream`, and
  `--autoplay-policy=no-user-gesture-required` for the chrome / chromium
  browsers. Electron is the Cypress default and **does not honour
  launchOptions.args** (you'll see a "browser launch options not supported
  by electron" warning if you accidentally re-enable that branch). Cypress
  auto-grants media permissions in Electron, so the toggle steps still hit
  the regular code paths via the `permissionStatus === 'prompt'` fallback.

How the backend plays along:
- `docker-compose.test.yml` injects synthetic `LIVEKIT_URL` /
  `LIVEKIT_API_KEY` / `LIVEKIT_API_SECRET` so that
  `videoCallConfig.enabled` is reported as `true` and the video-call button
  can be exercised. Note that, since we no longer exercise the connect
  path, the actual reachability of `LIVEKIT_URL` no longer matters for
  this spec.
