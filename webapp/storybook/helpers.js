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
  // Populated by story files before mount (e.g. FollowList.story.js), keyed by the fake userId each
  // story uses: { [userId]: [{ id, name, slug, ... }, ...] }. Read by the $apollo mock's
  // FollowConnections handler below.
  followListConnections: {},
  init(options = {}) {
    // Re-seeded on every call, i.e. fresh at the top of every *.story.js file (each calls
    // helpers.init() before generating its own fixtures) — so names/ids/dates from faker.person /
    // faker.string.uuid / faker.date etc. come out the same on every run regardless of what other
    // story files did first. Visual-regression screenshots need that: a random name or date baked
    // into a component render would fail the pixel diff on every single run, not just real changes.
    faker.seed(20260101)
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
    // Mirrors plugins/i18n.js's `app.$i18n = Vue.i18n` — Nuxt turns that into `this.$i18n` on every
    // component. Without it, the handful of callers that read `this.$i18n` directly (rather than the
    // usual `$t`/`$tc`) get undefined and throw the moment they call `.locale()` on it.
    Vue.prototype.$i18n = Vue.i18n

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
        // FollowList.vue self-fetches via this query (id/first/offset/nameFilter variables) and only
        // sets `allLoaded` once a response's item count is under the page size. Falling through to
        // the generic `{ data: {} }` below left `allLoaded` permanently false, and InfiniteScrollList's
        // auto-load-more (fires on every render while the list doesn't fill its container) turned that
        // into an unbroken fetch → re-render → fetch loop — a real, tab-freezing infinite loop, not a
        // slow one. Paginating `helpers.followListConnections[id]` for real is what actually ends it.
        if (key.includes('FollowConnections')) {
          const { id, first, offset, nameFilter } = data.variables
          let all = helpers.followListConnections[id] || []
          if (nameFilter) {
            const q = nameFilter.toLowerCase()
            all = all.filter((u) => u.name.toLowerCase().includes(q))
          }
          const page = all.slice(offset, offset + first)
          return {
            data: {
              User: [
                {
                  id,
                  followingCount: all.length,
                  following: page,
                  followedByCount: all.length,
                  followedBy: page,
                },
              ],
            },
          }
        }
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
    Vue.use(VueRouter)
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
  // ResponsiveImage.vue (used by AvatarImage, PostTeaser, ...) builds its `srcset` from
  // image.w320/w640/w1024 — a bare `{ url }` fixture renders `srcset="undefined 320w, ..."`, which
  // the browser prefers over `src` and then 404s. None of the fixed test images below are served in
  // multiple sizes, so every breakpoint just points at the same url.
  avatarImage(url) {
    return { url, w320: url, w640: url, w1024: url }
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
