import Vue from 'vue'
import VueIziToast from 'vue-izitoast'

import 'izitoast/dist/css/iziToast.css'

// `$env` rather than an import of ~/config: the config module's values are inlined at BUILD time,
// and this image is built once and started with per-deployment env afterwards. nuxt-env's plugin is
// registered as a module and therefore runs before this one, so $env is populated here. The fallback
// covers both a missing key and a non-numeric value.
export default ({ $env }) => {
  Vue.use(VueIziToast, {
    position: 'bottomRight',
    transitionIn: 'bounceInLeft',
    layout: 2,
    theme: 'dark',
    timeout: Number($env && $env.TOAST_TIMEOUT) || 5000,
  })
}
