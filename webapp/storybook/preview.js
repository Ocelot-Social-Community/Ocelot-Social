import Vue from 'vue'
import Vuex from 'vuex'
import { action } from '@storybook/addon-actions'
import '../assets/css/resets.css'

Vue.use(Vuex)
Vue.component('nuxt-link', {
  props: ['to'],
  methods: {
    log() {
      action('link clicked')(this.to)
    },
  },
  template: '<a href="#" @click.prevent="log()"><slot>NuxtLink</slot></a>',
})
Vue.component('client-only', {
  render() {
    return this.$slots.default
  },
})
Vue.component('v-popover', {
  template: '<div><slot>Popover Content</slot></div>',
})

// Globally register base components
const componentFiles = require.context('../components/_new/generic', true, /Base[a-zA-Z]+\.vue/)

componentFiles.keys().forEach((fileName) => {
  const component = componentFiles(fileName)
  const componentConfig = component.default || component
  const componentName = component.name || fileName.replace(/^.+\//, '').replace('.vue', '')

  Vue.component(componentName, componentConfig)
})

// Setup design token addon — the tokens live in plain CSS custom properties now.
//
// Deliberately just the token file, not everything under assets/css/. The addon groups what it reads
// by `@tokens` annotations, and root-tokens.css is the only file carrying them; main.css, resets.css,
// tooltip.css and friends are component rules and would arrive as ungrouped noise in the token tab.
// The dot is escaped, unlike the `/.\.css$/` this replaces, where it matched any character.
const cssReq = require.context('!!raw-loader!~/assets/css', false, /^\.\/root-tokens\.css$/)
const cssTokenFiles = cssReq
  .keys()
  .map((filename) => ({ filename, content: cssReq(filename).default }))

export const parameters = {
  designToken: {
    files: {
      css: cssTokenFiles,
    },
  },
  options: {
    storySort: (a, b) =>
      a[1].kind === b[1].kind ? 0 : a[1].id.localeCompare(b[1].id, { numeric: true }),
  },
}
