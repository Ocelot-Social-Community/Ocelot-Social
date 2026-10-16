import { createLocalVue } from '@vue/test-utils'
import Vue from 'vue'
import VueObserveVisibility from '~/plugins/vue-observe-visibility'
import { renderAndHydrate } from '~/test/hydration'
import ProfileList from './ProfileList.vue'

const LocalVue = createLocalVue()
LocalVue.use(VueObserveVisibility)
LocalVue.prototype.$t = (key) => key

const fakeProfiles = (count) =>
  Array.from({ length: count }, (_, i) => ({ id: `u${i}`, name: `User ${i}`, slug: `user-${i}` }))

describe('ProfileList', () => {
  describe('hydrating server-rendered markup with enough profiles for the virtual scroller', () => {
    const profiles = fakeProfiles(51)

    const hydrate = () =>
      renderAndHydrate(
        {
          render: (h) =>
            h(ProfileList, {
              props: {
                uniqueName: 'profiles',
                title: 'Profiles',
                allProfilesCount: profiles.length,
                profiles,
              },
              scopedSlots: { item: ({ item }) => h('span', item.name) },
            }),
        },
        {
          LocalVue,
          // What Nuxt defines in its server and client bundles.
          server: () => {
            process.client = false
          },
          client: () => {
            process.client = true
          },
        },
      )

    afterEach(() => {
      delete process.client
      document.body.innerHTML = ''
    })

    it('matches the markup of the server', async () => {
      const { warnings } = await hydrate()
      expect(warnings).toEqual([])
    })

    it('switches to the virtual scroller once mounted', async () => {
      const { vm } = await hydrate()
      await Vue.nextTick()
      expect(vm.$el.querySelector('ul')).toBeNull()
      expect(vm.$el.querySelector('.profiles-virtual')).toBeTruthy()
    })
  })
})
