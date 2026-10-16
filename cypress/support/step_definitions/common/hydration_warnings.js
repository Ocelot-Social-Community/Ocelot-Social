import { AfterStep, Before } from '@badeball/cypress-cucumber-preprocessor'
import { describeWarning, hydrationFailureMessage, isHydrationWarning } from '../../hydration'

// Every scenario fails on a Vue hydration mismatch, on whichever page it loads.
//
// When the client renders different markup than the server sent, Vue 2 throws the server's DOM away
// and renders the component again from scratch: content flickers, focus and input are lost, and the
// server render was wasted. Nothing breaks visibly, so it went unnoticed (#6442). The production
// runtime does not even report it — the e2e image builds its client on Vue's development runtime for
// exactly this (VUE_DEV_RUNTIME in webapp/nuxt.config.js); `nuxt dev` has it anyway.
//
// Only the hydration messages count (see ../../hydration.js). The development runtime warns about
// plenty more — prop types and the like — and none of that fails a scenario here.

// How long a server-rendered page may take to mount. Past it the step fails: its hydration could not
// be checked, and a warning raised later would go unnoticed if this was the scenario's last step.
const MOUNT_TIMEOUT = 10000

const warnings = []
const mounted = new WeakSet()

Cypress.on('window:before:load', (win) => {
  ;['error', 'warn'].forEach((method) => {
    const original = win.console[method]
    win.console[method] = function (...args) {
      if (isHydrationWarning(args)) {
        warnings.push({ url: win.location.href, text: describeWarning(args) })
      }
      return original.apply(this, args)
    }
  })
  // Nuxt calls this once the app is mounted (its `nuxtReady`, in the tick after `$mount`). Hydration
  // runs inside `$mount`, so from here on every warning it raises has been recorded.
  win._onNuxtLoaded = () => mounted.add(win)
})

const hydrated = (win) =>
  new Cypress.Promise((resolve, reject) => {
    const start = Date.now()
    const poll = () => {
      // A blank or non-Nuxt window has nothing to hydrate.
      const serverRendered = Boolean(win.__NUXT__ && win.__NUXT__.serverRendered)
      if (!serverRendered || mounted.has(win)) resolve()
      else if (Date.now() - start > MOUNT_TIMEOUT)
        reject(
          new Error(
            `${win.location.href} did not mount within ${MOUNT_TIMEOUT / 1000}s, so whether it ` +
              'hydrated its server-rendered markup could not be checked',
          ),
        )
      else setTimeout(poll, 50)
    }
    poll()
  })

// After EVERY step rather than once per scenario: the step that loaded the page takes the blame, and
// an After hook would be skipped for a scenario that already failed anyway. Waiting for the mount
// first is what catches a page the step's last command merely started loading.
AfterStep({ name: 'no hydration mismatch' }, () => {
  cy.window({ log: false })
    .then({ timeout: MOUNT_TIMEOUT + 5000 }, hydrated)
    .then(() => {
      if (warnings.length) throw new Error(hydrationFailureMessage(warnings.splice(0)))
    })
})

// A failed scenario skips its remaining steps, so whatever the previous one recorded after its
// failing step must not be blamed on this one.
Before(() => {
  warnings.length = 0
})
