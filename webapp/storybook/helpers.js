import Vue from 'vue'
import Vuex from 'vuex'
import VueRouter from 'vue-router'
import vuexI18n from 'vuex-i18n/dist/vuex-i18n.umd.js'
import { faker } from '@faker-js/faker'
import Filters from '~/plugins/vue-filters'
import Directives from '~/plugins/vue-directives'
import IziToast from '~/plugins/izi-toast'
import layout from './layout.vue'
import locales from '~/locales/index.js'
import '~/plugins/v-tooltip'

Vue.use(VueRouter)

const helpers = {
  init(options = {}) {
    Vue.use(Vuex)
    // `~/plugins/vue-filters` is a Nuxt plugin — it expects `({ app })`, not the `Vue` constructor
    // `Vue.use` would hand it. Called wrong, `getDateFnsLocale` closes over an app without `$i18n`
    // and throws the moment `date`/`dateTime` filters actually run.
    Filters({ app: { $i18n: { locale: () => 'en' } } })
    Vue.use(IziToast)
    Vue.use(Directives)

    Vue.use(vuexI18n.plugin, helpers.store)
    locales.forEach(({ code }) => {
      Vue.i18n.add(code, require(`~/locales/${code}.json`))
    })

    Vue.i18n.set('en')
    Vue.i18n.fallback('en')

    // Mirrors ~/plugins/permissions.js and ~/plugins/policy.js, which inject $can/$policy via the
    // Nuxt plugin context — a mechanism storybook never runs. Stories get the permissive default
    // (everything allowed) rather than every gated template throwing on an undefined method.
    Vue.prototype.$can = (permission) => helpers.store.getters['auth/can'](permission)
    Vue.prototype.$policy = {
      get: (key) => helpers.store.getters['policy/getEffective'](key),
      snapshot: () => helpers.store.getters['policy/snapshot'],
    }
    // Nuxt-env normally injects $env from config/index.js at build time. That file itself is
    // Node-only (dotenv, execSync git describe), so it isn't imported here — just its defaults,
    // matched by hand, enough for components whose data()/mounted() read $env.* unconditionally.
    Vue.prototype.$env = {
      SUPPORT_EMAIL: 'hello@ocelot.social',
      NETWORK_NAME: 'Ocelot.social',
      LANGUAGE_DEFAULT: 'en',
      LANGUAGE_FALLBACK: 'en',
      NODE_ENV: 'development',
      VERSION: 'storybook',
      COOKIE_EXPIRE_TIME: 356,
      MAPBOX_TOKEN: '',
    }
    // Shared across every story, on purpose: `helpers.init()` runs at module-load time for every
    // *.story.js file, and since they all land in one bundle, whichever file's plugins ran last used
    // to overwrite Vue.prototype.$apollo for everyone — a component two stories away could inherit a
    // mock that only recognizes another component's query names and throws "Query name not found!"
    // on its own. One mock, covering every query/mutation actually used by a story, replaces that
    // whack-a-mole. It also always returns a Promise — callers that `.catch()` the result (several
    // do) get a real rejection to catch instead of a synchronous throw skipping past their `.catch`.
    Vue.prototype.$apollo = {
      query: async (data) => {
        const key = JSON.stringify(data)
        if (key.includes('isValidInviteCode')) return { data: { isValidInviteCode: true } }
        if (key.includes('VerifyNonce')) return { data: { VerifyNonce: true } }
        if (key.includes('embed')) {
          return {
            data: {
              embed: {
                image: 'https://i.ytimg.com/vi/ptCcgLM-p8k/maxresdefault_live.jpg',
                title: 'Video Titel',
                description: 'Video Description',
                url: 'https://www.youtube.com/watch?v=qkdXAtO40Fo',
                html: '<iframe width="auto" height="250" src="https://www.youtube.com/embed/qkdXAtO40Fo?feature=oembed" frameborder="0" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>',
              },
            },
          }
        }
        return { data: {} }
      },
      mutate: async (data) => {
        const key = JSON.stringify(data)
        if (key.includes('UpdateUser')) {
          return { data: { UpdateUser: { id: data.variables.id, locale: data.variables.locale } } }
        }
        if (key.includes('SignupVerification')) {
          return { data: { SignupVerification: { ...data.variables } } }
        }
        if (key.includes('Signup')) return { data: { Signup: { email: data.variables.email } } }
        return { data: {} }
      },
    }

    const { plugins = [] } = options
    plugins.forEach((plugin) => Vue.use(plugin))
  },
  store: new Vuex.Store({
    modules: {
      auth: {
        namespaced: true,
        getters: {
          isModerator() {
            return true
          },
          canAccessModeration() {
            return true
          },
          isAdmin() {
            return true
          },
          user() {
            return { id: '1', name: 'admin', slug: 'admin' }
          },
          can() {
            return () => true
          },
        },
      },
      policy: {
        namespaced: true,
        getters: {
          getEffective: () => () => true,
          snapshot: () => ({}),
        },
      },
      categories: {
        namespaced: true,
        state: () => ({ categories: [], isInitialized: false }),
        mutations: {
          SET_CATEGORIES() {},
          SET_INIZIALIZED() {},
        },
        actions: {
          init() {},
        },
        getters: {
          categories: (state) => state.categories,
          isInitialized: (state) => state.isInitialized,
        },
      },
    },
  }),
  layout(storyFn) {
    const ctx = storyFn()
    return {
      // A fresh instance per story rather than one shared module-level singleton — Storybook is an
      // SPA, so switching stories re-renders a new root without a page reload; sharing one router
      // across root instances would carry navigation state from a previous story into the next.
      // Nuxt always provides a router, so components that read `this.$route` (directly, or
      // transitively through data()) assume it exists. Without this, data() throws before ever
      // reaching its other fields, which is why unrelated props show up as "not defined on the
      // instance" — Vue swallows the data() error and continues with an empty object.
      router: new VueRouter(),
      components: { ctx, layout },
      template: `
      <layout>
        <ds-flex>
          <ctx />
        </ds-flex>
      </layout>`,
    }
  },
  fakeUser(n) {
    return new Array(n || 1).fill(0).map(() => {
      const name = faker.person.fullName()
      return {
        id: faker.string.uuid(),
        name,
        slug: faker.helpers.slugify(name),
      }
    })
  },
  fakePost(n) {
    return new Array(n || 1).fill(0).map(() => {
      const title = faker.lorem.words()
      const content = faker.lorem.paragraph()
      return {
        id: faker.string.uuid(),
        title,
        content,
        slug: faker.lorem.slug({ min: 1, max: 3 }, title),
        shoutedCount: faker.number.int(),
        commentsCount: faker.number.int(),
        clickedCount: faker.number.int(),
        viewedTeaserCount: faker.number.int(),
        postType: ['Article'],
      }
    })
  },
}

export default helpers
