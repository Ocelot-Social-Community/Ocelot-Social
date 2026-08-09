import path from 'path'
import fs from 'fs'
import manifest from './constants/manifest.js'
import metadata from './constants/metadata.js'
import locales from './locales/index.js'
import { brandingHeadHtml } from './utils/brandingHead.js'

const CONFIG = require('./config').default // we need to use require since this is only evaluated at compile time.

// Map language code (e.g. 'de') to Open Graph locale (e.g. 'de_DE') using existing locales definition
const toOgLocale = (code) => {
  const locale = locales.find((l) => l.code === code)
  return locale ? locale.iso.replace('-', '_') : null
}
const ogLocale = toOgLocale(CONFIG.LANGUAGE_DEFAULT)
const ogLocaleAlternates = locales
  .filter((l) => l.enabled && l.code !== CONFIG.LANGUAGE_DEFAULT)
  .map((l) => l.iso.replace('-', '_'))

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

  // RUNTIME (server-only), unlike `env` below: `env` is compiled into the bundle by webpack's
  // DefinePlugin, so every `process.env.GRAPHQL_URI` in application code is frozen to whatever was set
  // when `nuxt build` ran — in the Docker build: nothing, i.e. the localhost fallback. Anything the
  // SERVER must resolve per deployment has to come from here instead. (The proxy targets below read
  // CONFIG directly and are fine: nuxt.config.js is evaluated at server start, not at build time.)
  privateRuntimeConfig: {
    graphqlUri: process.env.GRAPHQL_URI || CONFIG.GRAPHQL_URI,
  },

  // RUNTIME and reaches the BROWSER (serialised as window.__NUXT__.config), which `env` above cannot:
  // the auth cookie is written and read client-side, so its name and attributes have to survive into
  // the bundle-independent config. That is what makes them deployment values (Helm `webapp.env.*` →
  // pod env) on a pre-built image — see utils/authCookie.js for why @nuxtjs/apollo's own token name
  // could never be one.
  publicRuntimeConfig: {
    cookieName: CONFIG.COOKIE_NAME,
    cookieLegacyNames: CONFIG.COOKIE_NAME_LEGACY,
    cookieExpireDays: CONFIG.COOKIE_EXPIRE_TIME,
    cookieHttpsOnly: CONFIG.COOKIE_HTTPS_ONLY,
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
      ...[
        { hid: 'og:title', property: 'og:title', content: manifest.name },
        { hid: 'og:description', property: 'og:description', content: CONFIG.DESCRIPTION },
        { hid: 'og:site_name', property: 'og:site_name', content: manifest.name },
        { hid: 'og:image', property: 'og:image', content: metadata.OG_IMAGE },
        { hid: 'og:image:alt', property: 'og:image:alt', content: metadata.OG_IMAGE_ALT },
        { hid: 'og:image:width', property: 'og:image:width', content: metadata.OG_IMAGE_WIDTH },
        { hid: 'og:image:height', property: 'og:image:height', content: metadata.OG_IMAGE_HEIGHT },
        { hid: 'og:image:type', property: 'og:image:type', content: metadata.OG_IMAGE_TYPE },
        { hid: 'og:type', property: 'og:type', content: 'website' },
        { hid: 'og:locale', property: 'og:locale', content: ogLocale },
        ...ogLocaleAlternates.map((alt) => ({
          property: 'og:locale:alternate',
          content: alt,
        })),
        { hid: 'twitter:card', name: 'twitter:card', content: 'summary_large_image' },
      ].filter((tag) => tag.content),
    ],
    link: [
      {
        // `hid` is what makes this a SLOT rather than a fixed tag: plugins/branding-favicon.js
        // rewrites this entry per request, so a branded instance server-renders its own icon instead
        // of shipping the vanilla one and swapping it after hydration. Everything below is the
        // fallback for an unbranded (vanilla) instance.
        hid: 'icon',
        rel: 'icon',
        type: 'image/x-icon',
        href: '/favicon.ico',
      },
      {
        // Declared here rather than by @nuxtjs/pwa (`icon: false` below): the module bakes the hash of
        // a build-time static/icon.png into the href and adds no `hid`, which makes it impossible to
        // retarget per brand. branding-favicon.js points it at the brand's `assets.icon`; iOS only.
        hid: 'apple-touch-icon',
        rel: 'apple-touch-icon',
        href: '/icon.png',
      },
      {
        // Points at the dynamic serverMiddleware route (content per active brand); href is stable.
        rel: 'manifest',
        href: '/manifest.webmanifest',
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
    // Design token defaults (:root custom properties) — must load once, globally
    '~assets/css/root-tokens.css',
    '~assets/css/resets.css',
    '~assets/css/main.css',
    // @ocelot-social/ui CSS variables
    '~assets/css/ocelot-ui-variables.css',
    // Utility classes replacing ds-* Vue components
    '~assets/css/ds-compat.css',
    // UI library component styles (Tailwind utilities + OsMenu CSS)
    '../packages/ui/dist/style.css',
    // Ocelot composite component styles (ActionButton, LabeledButton)
    '../packages/ui/dist/ui.css',
  ],

  /*
   ** Global processed styles
   */
  /*
   ** Dynamic branding assets: serve /branding/* from $OCELOT_BRANDING_ASSETS_DIR at runtime
   ** (logos, favicon, static-page HTML, CSS, fonts + each brand's virtual branding.json + manifest.json)
   ** so brandings are bound without being baked into the image. Archives are built by the branding
   ** package (packages/branding: scripts/build-brand-archive.ts); see server-middleware/branding-assets.js.
   */
  serverMiddleware: [
    // FIRST: mirror the brand archives from the backend into $OCELOT_BRANDING_ASSETS_DIR, so the
    // archive is deployed once (backend side) and everything below still reads it off disk.
    '~/server-middleware/branding-sync.js',
    { path: '/branding', handler: '~/server-middleware/branding-assets.js' },
    // Dynamic PWA manifest generated from the active brand's metadata (replaces the static
    // @nuxtjs/pwa manifest, disabled below) so app name / theme colour follow a live brand switch.
    { path: '/manifest.webmanifest', handler: '~/server-middleware/manifest.js' },
  ],

  /*
   ** Render hooks
   */
  hooks: {
    // Brand the FIRST paint. plugins/branding.js resolves the active brand during SSR and stores it in
    // the nuxt state; without this hook its theme (CSS custom properties + @font-face) and stylesheets
    // were only applied by plugins/branding-head.js after hydration, so the page flashed vanilla
    // colours and fonts before switching — most visibly in the footer, whose link colour is
    // $color-footer-link → $color-primary → var(--color-primary).
    //
    // It has to be THIS hook and not vue-meta: the renderer builds the head as
    // `meta.link + meta.style + … + renderResourceHints() + renderStyles()`, so anything vue-meta
    // contributes precedes the app's CSS bundles and loses the cascade on equal specificity (`:root`
    // vs `:root`). templateParams runs after renderStyles(), which is exactly where the client plugin
    // appends its tags too — one cascade for both paths.
    'vue-renderer:ssr:templateParams'(templateParams, renderContext) {
      const branding = renderContext && renderContext.nuxt && renderContext.nuxt.branding
      if (branding) templateParams.HEAD += brandingHeadHtml(branding)
    },
  },

  /*
   ** Plugins to load before mounting the App
   */
  plugins: [
    // First: $authCookie is what the auth store reads/writes the session with.
    { src: '~/plugins/auth-cookie.js', ssr: true },
    { src: '~/plugins/branding.js', ssr: true },
    // Directly after branding.js — it reads the accessor that one sets. Runs on BOTH sides on purpose:
    // the server renders the branded <link rel="icon"> and the client resolves the same value, so
    // there is no vanilla icon to swap out after hydration.
    '~/plugins/branding-favicon.js',
    { src: '~/plugins/branding-head.js', ssr: false },
    { src: '~/plugins/policy.js', ssr: true },
    { src: '~/plugins/policy-subscribe.js', ssr: false },
    // Live branding switch: reload when the activeBranding policy value diverges from the
    // server-rendered brand. After policy-subscribe so the policy store is live.
    { src: '~/plugins/branding-subscribe.js', ssr: false },
    { src: '~/plugins/permissions.js', ssr: true },
    { src: '~/plugins/permissions-subscribe.js', ssr: false },
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
    '@nuxtjs/apollo',
    // AFTER @nuxtjs/apollo on purpose: nuxt's addPlugin UNSHIFTS, so module plugins run in REVERSE
    // registration order — this is what puts $cookies in place before the apollo client config is
    // built, which needs it to resolve the auth cookie (plugins/apollo-config.js getAuth).
    'cookie-universal-nuxt',
    '@nuxtjs/axios',
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
      },
    },
    '/activitypub': {
      // make this configurable (nuxt-dotenv)
      target: CONFIG.GRAPHQL_URI,
      toProxy: true, // cloudflare needs that
      headers: {
        Accept: 'application/json',
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
      },
    },
  },

  // Give apollo module options
  apollo: {
    // NOT the auth cookie's configuration — utils/authCookie.js is, and plugins/apollo-config.js
    // hands the module a `getAuth` that uses it. These values only feed the module's own
    // $apolloHelpers (onLogin / onLogout / getToken), which nothing calls any more: the module bakes
    // them into the generated plugin as literals when the bundle is built, so on the ONE pre-built
    // image every deployment shares they can only ever be the build-time defaults. They are kept in
    // sync with the real settings so a future caller cannot silently get a different cookie.
    // The defaults noted below are OURS (webapp/config/index.js), not the module's: looking for the
    // module's `apollo-token` while debugging a session would send you after a cookie that never
    // exists here.
    tokenName: CONFIG.COOKIE_NAME, // $COOKIE_NAME, default 'ocelot-social-token'
    cookieAttributes: {
      expires: CONFIG.COOKIE_EXPIRE_TIME, // $COOKIE_EXPIRE_TIME, default 730 (days)
      /** * Define the path where the cookie is available. Defaults to '/' */
      // For some reason this can vary - lets see if setting this helps.
      path: '/', // optional
      /** * A Boolean indicating if the cookie transmission requires a
       * secure protocol (https). */
      secure: CONFIG.COOKIE_HTTPS_ONLY, // $COOKIE_HTTPS_ONLY, default true in production
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

  pwa: {
    // Static manifest disabled — it is served DYNAMICALLY per active brand from
    // server-middleware/manifest.js (see serverMiddleware + the head.link[rel=manifest] above), so
    // the installed-app name / theme colour follow a live brand switch without a rebuild.
    manifest: false,
    // Icon module disabled — with `manifest: false` its only remaining output was two head links
    // generated from the build-time static/icon.png:
    //   <link rel="shortcut icon" href="/_nuxt/icons/icon_64.<hash>.png">
    //   <link rel="apple-touch-icon" href="/_nuxt/icons/icon_512.<hash>.png" sizes="512x512">
    // `shortcut icon` is a legacy alias of `icon`, so that vanilla 64px PNG COMPETED with the brand's
    // favicon — and since the module adds no `hid` and hashes the href at build time, neither vue-meta
    // nor the client plugin could retarget it. A branded instance kept the ocelot icon in the tab
    // whichever candidate the browser happened to prefer. The two links are declared in head.link
    // above instead, with hids, so branding-favicon.js can rewrite them.
    icon: false,
    meta: {
      // Prevent @nuxtjs/pwa from auto-generating description from package.json;
      // we set description and og:description manually in head.meta above.
      description: CONFIG.DESCRIPTION,
      ogHost: false,
    },
  },

  render: {
    // Generate preload hints for critical JS/CSS/font assets
    resourceHints: true,
  },

  /*
   ** Build configuration
   */
  build: {
    // Transpile ESM modules for SSR compatibility
    // vue-demi and @ocelot-social/ui must be transpiled to ensure module resolution works
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
    cache: true,
    /*
     ** PostCSS: only ADDING a plugin, never replacing the defaults.
     **
     ** Given as an object (not an array), Nuxt merges it into its own plugin set — postcss-import,
     ** postcss-url, postcss-preset-env, cssnano all stay. `order: 'presetEnvAndCssnanoLast'` (Nuxt's
     ** default) then guarantees the sequence we need: global-data runs BEFORE preset-env, which is the
     ** whole point — it prepends the @custom-media definitions to every stylesheet PostCSS sees, and
     ** preset-env expands them right after.
     **
     ** Why it has to be injected rather than imported: Nuxt 2 processes each component's <style> block
     ** as its own PostCSS unit. A definition in a globally loaded stylesheet is not in scope there, so
     ** `@media (--vp-mobile)` would pass through to the browser unresolved and the rule would be dead.
     */
    postcss: {
      postcssOptions: {
        plugins: {
          '@csstools/postcss-global-data': {
            files: ['./assets/css/breakpoints.css'],
          },
        },
      },
    },
    // babel config
    babel: {
      // To prevent  ERROR  [BABEL] Note: The code generator has deoptimised the styling of [..] as it exceeds the max of 500KB.
      compact: true,
      cacheDirectory: true,
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
        config.devtool = ctx.isDev ? 'eval-source-map' : 'hidden-source-map'
        // The branding runtime loader (plugins/branding.js, components/utils/brandingHtml.js) reads
        // brand archives off disk under a `process.server` guard, but webpack still resolves the static
        // require('@ocelot-social/branding/dist/discover.js') when building the CLIENT bundle. That
        // server-only chain (discover.js → tar.js → nanotar) uses `node:`-scheme built-ins (unresolvable
        // in webpack 4) and nanotar's ESM optional chaining (unparseable by webpack 4). Alias those two
        // submodules to an empty stub for the client — the guarded code never runs in the browser.
        const brandingServerStub = path.resolve(__dirname, 'webpack/branding-server-stub.js')
        config.resolve.alias['@ocelot-social/branding/dist/discover.js$'] = brandingServerStub
        config.resolve.alias['@ocelot-social/branding/dist/tar.js$'] = brandingServerStub
      }

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
      config.resolve.alias['@ocelot-social/ui/ocelot$'] = path.join(uiLibraryPath, 'ocelot.mjs')
      config.resolve.alias['@ocelot-social/ui/style.css$'] = path.join(uiLibraryPath, 'style.css')
      config.resolve.alias['@ocelot-social/ui/ui.css$'] = path.join(uiLibraryPath, 'ui.css')
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
