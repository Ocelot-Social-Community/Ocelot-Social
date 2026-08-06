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
// Shared across every story via `layout()` below — Nuxt always provides a router, so components
// that read `this.$route` (directly, or transitively through data()) assume it exists. Without this,
// data() throws before ever reaching its other fields, which is why unrelated props show up as
// "not defined on the instance" — Vue swallows the data() error and continues with an empty object.
const router = new VueRouter()

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
      router,
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
