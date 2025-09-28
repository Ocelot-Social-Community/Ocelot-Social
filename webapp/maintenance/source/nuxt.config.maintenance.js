import defaultConfig from './nuxt.config.js'

const { css, styleResources, manifest, build, mode, buildModules } = defaultConfig

export default {
  mode,

  head: {
    title: manifest.name,
    meta: [
      {
        charset: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'initial-scale=1',
      },
      {
        hid: 'description',
        name: 'description',
        content: `Maintenance page for ${manifest.name}`,
      },
    ],
    link: [
      {
        rel: 'icon',
        type: 'image/x-icon',
        href: '/favicon.ico',
      },
    ],
  },

  css,
  styleResources,

  plugins: [
    { src: '~/plugins/base-components.js', ssr: true },
    { src: `~/plugins/styleguide.js`, ssr: true },
    { src: '~/plugins/i18n.js', ssr: true },
    { src: '~/plugins/v-tooltip.js', ssr: false },
  ],

  router: {
    extendRoutes(routes, resolve) {
      routes.push({
        name: 'maintenance',
        path: '*',
        component: resolve(__dirname, 'pages/index.vue'),
      })
    },
  },

  modules: ['cookie-universal-nuxt', '@nuxtjs/style-resources'],

  buildModules,
  manifest,
  build,
}
