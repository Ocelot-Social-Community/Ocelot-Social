import defaultConfig from './nuxt.config.js'

const { css, styleResources, manifest } = defaultConfig

export default {
  css,
  styleResources,
  manifest,

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

  plugins: [
    { src: `~/plugins/styleguide.js`, ssr: true },
    { src: '~/plugins/i18n.js', ssr: true },
    { src: '~/plugins/v-tooltip.js', ssr: false },
  ],

  modules: ['cookie-universal-nuxt', '@nuxtjs/style-resources'],

  router: {
    extendRoutes(routes, resolve) {
      routes.push({
        name: 'maintenance',
        path: '*',
        component: resolve(__dirname, 'pages/index.vue'),
      })
    },
  },
  build: {
    extend(config, ctx) {
      config.module.rules.push({
        enforce: 'pre',
        test: /\.html$/,
        loader: 'raw-loader',
        exclude: /(node_modules)/,
      })
    },
  },
}
