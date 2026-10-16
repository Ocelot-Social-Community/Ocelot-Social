// Server-render a component, hand the markup to the DOM the way a browser would, then hydrate it
// on the client — the round trip Nuxt does on every SSR page load. Production Vue 2 gives up on a
// mismatching tree silently and re-renders it from scratch, so a test is the only place where such
// a mismatch becomes visible: the development build used by Jest reports it as a warning.
import Vue from 'vue'
import { createRenderer } from 'vue-server-renderer'
import { runInThisContext } from 'vm'

// Jest hands every test file a copy of `process.env`, so assigning `TZ` there changes nothing.
// Node switches the time zone of the whole worker when the variable of the real process changes,
// which is reachable from the context the test sandbox runs in. `undefined` restores the zone the
// worker started with — which may itself be set (`TZ=… jest`), so it is put back, not deleted.
const realProcess = runInThisContext('process')
const initialTimeZone = realProcess.env.TZ
export const setTimeZone = (timeZone = initialTimeZone) => {
  if (timeZone === undefined) {
    delete realProcess.env.TZ
  } else {
    realProcess.env.TZ = timeZone
  }
}

// `options` are the root instance options (e.g. `{ render: (h) => h(Component, { props }) }`),
// created once for the server and once for the client. `server` and `client` prepare the
// environment of each side, e.g. a time zone or a media query. Resolves to the hydrated instance
// and every Vue warning raised while hydrating.
export const renderAndHydrate = async (
  options,
  { LocalVue = Vue, server = () => {}, client = () => {} } = {},
) => {
  server()
  const html = await createRenderer().renderToString(new LocalVue(options))

  const container = document.createElement('div')
  // innerHTML runs the HTML parser, which corrects invalid nesting (e.g. a <div> inside a <p>)
  // like a browser does with the server response.
  container.innerHTML = html
  document.body.appendChild(container)

  client()
  const warnings = []
  const { warnHandler } = Vue.config
  Vue.config.warnHandler = (msg) => warnings.push(msg)
  // Vue logs the mismatching nodes to the console in addition to the warning.
  const consoleWarn = jest.spyOn(console, 'warn').mockImplementation(() => {})
  try {
    const vm = new LocalVue(options).$mount(container.firstElementChild, true)
    return { vm, warnings }
  } finally {
    Vue.config.warnHandler = warnHandler
    consoleWarn.mockRestore()
  }
}
