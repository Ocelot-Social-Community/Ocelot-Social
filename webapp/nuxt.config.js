import path from 'path'
import fs from 'fs'
import manifest from './constants/manifest.js'
import metadata from './constants/metadata.js'

const CONFIG = require('./config').default // we need to use require since this is only evaluated at compile time.

const styleguidePath = '../styleguide'
const styleguideStyles = [
  // `${styleguidePath}/src/system/styles/main.scss`,
  // `${styleguidePath}/src/system/styles/shared.scss`,
  `${styleguidePath}/dist/shared.scss`,
]

export default {
  buildDir: CONFIG.NUXT_BUILD,
  mode: 'universal',

  dev: CONFIG.DEBUG,
  debug: CONFIG.DEBUG ? 'nuxt:*,app' : null,

  modern: CONFIG.PRODUCTION ? 'server' : false,

  pageTransition: {
    name: 'slide-up',
    mode: 'out-in',
  },

  env: {
    ...CONFIG,
    // pages which do NOT require a login
    publicPages: [
      'login',
      'logout',
      'password-reset-request',
      'password-reset-enter-nonce',
      'password-reset-change-password',
      'registration',
      'static', // _static.vue catch-all for footer pages (organization, imprint, etc.)
    ],
    // pages to keep alive
    keepAlivePages: ['index'],
  },
  /*
   ** Headers of the page
   */
  head: {
    title: manifest.name,
    titleTemplate: `%s - ${manifest.name}`,
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
        content: CONFIG.DESCRIPTION,
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

  /*
   ** Customize the progress-bar color
   */
  loading: {
    color: '#86b31e',
    height: '2px',
    duration: 20000,
  },

  /*
   ** Global CSS
   */
  css: [
    '~assets/_new/styles/resets.scss',
    '~assets/styles/main.scss',
    '~assets/styles/imports/_branding.scss',
    // @ocelot-social/ui CSS variables (loaded before styleguide)
    '~assets/_new/styles/ocelot-ui-variables.scss',
    // Note: @ocelot-social/ui/style.css is loaded via plugin after styleguide
  ],

  /*
   ** Global processed styles
   */
  styleResources: {
    scss: [
      '~assets/_new/styles/uses.scss',
      ...styleguideStyles,
      '~assets/_new/styles/tokens.scss',
      '~assets/styles/imports/_branding.scss',
      '~assets/_new/styles/export.scss',
    ],
    hoistUseStatements: true,
  },

  /*
   ** Plugins to load before mounting the App
   */
  plugins: [
    { src: '~/plugins/base-components.js', ssr: true },
    {
      src: `~/plugins/styleguide.js`,
      ssr: true,
    },
    { src: '~/plugins/i18n.js', ssr: true },
    { src: '~/plugins/axios.js', ssr: false },
    { src: '~/plugins/keep-alive.js', ssr: false },
    { src: '~/plugins/vue-directives.js', ssr: false },
    { src: '~/plugins/v-tooltip.js', ssr: false },
    { src: '~/plugins/izi-toast.js', ssr: false },
    { src: '~/plugins/vue-filters.js' },
    { src: '~/plugins/vue-infinite-loading.js', ssr: false },
    { src: '~/plugins/vue-observe-visibility.js', ssr: false },
    { src: '~/plugins/v-mapbox.js', mode: 'client' },
    { src: '~/plugins/vue-advanced-chat.js', mode: 'client' },
    { src: '~/plugins/onlineStatus.js', mode: 'client' },
  ],

  router: {
    middleware: ['authenticated', 'termsAndConditions'],
    linkActiveClass: 'router-link-active',
    linkExactActiveClass: 'router-link-exact-active',
  },

  /*
   ** Nuxt.js modules
   */
  modules: [
    ['@nuxtjs/dotenv', { only: Object.keys(CONFIG) }],
    ['nuxt-env', { keys: Object.keys(CONFIG) }],
    [
      'vue-scrollto/nuxt',
      {
        offset: -100, // to compensate fixed navbar height
        duration: 1000,
      },
    ],
    'cookie-universal-nuxt',
    '@nuxtjs/apollo',
    '@nuxtjs/axios',
    '@nuxtjs/style-resources',
    '@nuxtjs/sentry',
    '@nuxtjs/pwa',
  ],

  buildModules: [
    // Vue 2.7 has built-in Composition API support
    // '@nuxtjs/composition-api/module' removed - no longer needed
  ],

  /*
   ** Axios module configuration
   */
  axios: {
    // See https://github.com/nuxt-community/axios-module#options
    debug: CONFIG.DEBUG,
    proxy: true,
  },
  proxy: {
    '/.well-known/webfinger': {
      target: CONFIG.GRAPHQL_URI,
      toProxy: true, // cloudflare needs that
      headers: {
        Accept: 'application/json',
        'X-UI-Request': true,
        'X-API-TOKEN': CONFIG.BACKEND_TOKEN,
      },
    },
    '/activitypub': {
      // make this configurable (nuxt-dotenv)
      target: CONFIG.GRAPHQL_URI,
      toProxy: true, // cloudflare needs that
      headers: {
        Accept: 'application/json',
        'X-UI-Request': true,
        'X-API-TOKEN': CONFIG.BACKEND_TOKEN,
      },
    },
    '/api': {
      // make this configurable (nuxt-dotenv)
      target: CONFIG.GRAPHQL_URI,
      pathRewrite: {
        '^/api': '',
      },
      toProxy: true, // cloudflare needs that
      headers: {
        Accept: 'application/json',
        'X-UI-Request': true,
        'X-API-TOKEN': CONFIG.BACKEND_TOKEN,
      },
    },
  },

  // Give apollo module options
  apollo: {
    tokenName: metadata.COOKIE_NAME, // optional, default: apollo-token
    cookieAttributes: {
      expires: CONFIG.COOKIE_EXPIRE_TIME, // optional, default: 7 (days)
      /** * Define the path where the cookie is available. Defaults to '/' */
      // For some reason this can vary - lets see if setting this helps.
      path: '/', // optional
      /** * A Boolean indicating if the cookie transmission requires a
       * secure protocol (https). Defaults to false. */
      secure: CONFIG.COOKIE_HTTPS_ONLY,
      sameSite: 'lax', // for the meaning see https://www.thinktecture.com/de/identity/samesite/samesite-in-a-nutshell/
    },
    // includeNodeModules: true, // optional, default: false (this includes graphql-tag for node_modules folder)

    // Watch loading state for all queries
    // See 'Smart Query > options > watchLoading' for detail
    // TODO: find a way to get this working
    // watchLoading(isLoading) {
    //   console.log('Global loading', countModifier)
    //   this.$nuxt.$loading.start()
    // },
    // required
    clientConfigs: {
      default: '~/plugins/apollo-config.js',
    },
  },

  sentry: {
    dsn: CONFIG.SENTRY_DSN_WEBAPP,
    publishRelease: !!CONFIG.COMMIT,
    config: CONFIG.COMMIT ? { release: CONFIG.COMMIT } : {},
  },

  manifest,
  /*
   ** Build configuration
   */
  build: {
    // Transpile ESM modules for SSR compatibility
    // vue-demi and @ocelot-social/ui must be transpiled to ensure isVue2 is consistent
    transpile: ['vue-demi', '@ocelot-social/ui'],
    // Invalidate cache between versions
    // https://www.reddit.com/r/Nuxt/comments/18i8hp2/comment/kdc1wa3/
    // https://v2.nuxt.com/docs/configuration-glossary/configuration-build/#filenames
    filenames: {
      chunk: ({ isDev, isModern }) =>
        isDev
          ? `[name]${isModern ? '.modern' : ''}.js`
          : `[contenthash:7]${isModern ? '.modern' : ''}_${CONFIG.VERSION}.js`,
      css: ({ isDev }) => (isDev ? '[name].css' : `css/[contenthash:7]_${CONFIG.VERSION}.css`),
    },
    // babel config
    babel: {
      // To prevent  ERROR  [BABEL] Note: The code generator has deoptimised the styling of [..] as it exceeds the max of 500KB.
      compact: true,
    },
    /*
     ** You can extend webpack config here
     */
    extend(config, ctx) {
      // Add the compilerOptions
      ctx.loaders.vue.compilerOptions = {
        // Add your compilerOptions here
        isCustomElement: (tagName) => {
          return tagName === 'vue-advanced-chat' || tagName === 'emoji-picker'
        },
      }

      if (ctx.isClient) {
        config.devtool = 'source-map'
      }

      config.resolve.alias['@@'] = path.resolve(__dirname, `${styleguidePath}/dist`)
      // Vue 2.7 has built-in Composition API - redirect old imports
      config.resolve.alias['@vue/composition-api'] = 'vue'
      // Ensure vue-demi uses webapp's Vue 2.7 (not UI library's Vue 3)
      config.resolve.alias['vue-demi'] = path.resolve(__dirname, 'node_modules/vue-demi')
      // UI library alias - point to dist folder
      // In Docker: /packages/ui, locally: ../packages/ui (via yarn link)
      const uiLibraryPath = fs.existsSync('/packages/ui/dist')
        ? '/packages/ui/dist'
        : path.resolve(__dirname, '../packages/ui/dist')
      config.resolve.alias['@ocelot-social/ui$'] = path.join(uiLibraryPath, 'index.mjs')
      config.resolve.alias['@ocelot-social/ui/style.css$'] = path.join(uiLibraryPath, 'style.css')
      config.module.rules.push({
        resourceQuery: /blockType=docs/,
        loader: require.resolve(`${styleguidePath}/src/loader/docs-trim-loader.js`),
      })

      const svgRule = config.module.rules.find((rule) => rule.test.test('.svg'))
      svgRule.test = /\.(png|jpe?g|gif|webp)$/
      config.module.rules.push({
        test: /\.svg$/,
        use: [
          'babel-loader',
          {
            loader: 'vue-svg-loader',
            options: {
              svgo: {
                plugins: [
                  {
                    removeViewBox: false,
                  },
                  {
                    removeDimensions: true,
                  },
                ],
              },
            },
          },
        ],
      })
      config.module.rules.push({
        enforce: 'pre',
        test: /\.html$/,
        loader: 'raw-loader',
        exclude: /(node_modules)/,
      })

      // Fix for ESM modules in node_modules (linkify-it, uc.micro)
      config.module.rules.push({
        test: /\.mjs$/,
        include: /node_modules/,
        type: 'javascript/auto',
      })

      const tagAttributesForTesting = ['data-test', ':data-test', 'v-bind:data-test']
      ctx.loaders.vue.compilerOptions = {
        modules: [
          {
            preTransformNode(abstractSyntaxTreeElement) {
              if (!ctx.isDev && CONFIG.NODE_ENV !== 'test') {
                const { attrsMap, attrsList } = abstractSyntaxTreeElement
                tagAttributesForTesting.forEach((attribute) => {
                  if (attrsMap[attribute]) {
                    delete attrsMap[attribute]
                    const index = attrsList.findIndex((attr) => attr.name === attribute)
                    attrsList.splice(index, 1)
                  }
                })
              }
              return abstractSyntaxTreeElement
            },
          },
        ],
      }
    },
  },
}
