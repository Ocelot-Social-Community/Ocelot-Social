import Vue from 'vue'
import VueIziToast from 'vue-izitoast'

import 'izitoast/dist/css/iziToast.css'

// iziToast's own default, and what any unusable configured value falls back to.
export const DEFAULT_TOAST_TIMEOUT = 5000

// Same rule as config/index.js' toPositiveNumber, and for the same reason: an env var arrives as a
// string. A bare `Number(value) || DEFAULT` would accept "-1" (iziToast dismisses immediately, so
// every toast assertion in the e2e suite would fail) and "Infinity" (no toast ever goes away, so
// they stack up and cover the elements later steps click).
export const toTimeout = (value) => {
  const timeout = Number(value)
  return Number.isFinite(timeout) && timeout > 0 ? timeout : DEFAULT_TOAST_TIMEOUT
}

// `$env` rather than an import of ~/config: the config module's values are inlined at BUILD time,
// and this image is built once and started with per-deployment env afterwards. nuxt-env's plugin is
// registered as a module and therefore runs before this one, so $env is populated here.
export default ({ $env }) => {
  Vue.use(VueIziToast, {
    position: 'bottomRight',
    transitionIn: 'bounceInLeft',
    layout: 2,
    theme: 'dark',
    timeout: toTimeout($env && $env.TOAST_TIMEOUT),
  })
}
