/**
 * The single seam for a full-page reload.
 *
 * jsdom 26 (jest-environment-jsdom 30) defines `window.location` as a NON-configurable accessor whose
 * `reload` is read-only, so a test can neither redefine the property nor spy on the method — the
 * `Object.defineProperty(window, 'location', …)` stub that used to work now throws. Routing every
 * reload through this module keeps that assertable: a spec mocks the module instead of the global.
 */
export const reloadPage = () => {
  window.location.reload()
}
