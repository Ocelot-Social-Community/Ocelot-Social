import Vue from 'vue'
import FloatingVue from 'floating-vue'

import 'floating-vue/dist/style.css'

Vue.use(FloatingVue, {
  delay: {
    show: 750,
    hide: 50,
  },
  distance: 2,
  skidding: 2,
})
