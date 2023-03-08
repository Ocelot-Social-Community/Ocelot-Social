import { shallowMount } from '@vue/test-utils'
import Badges from './Badges.vue'

describe('Badges.vue', () => {
  let propsData

  beforeEach(() => {
    propsData = {}
  })

  describe('shallowMount', () => {
    const Wrapper = () => {
      return shallowMount(Badges, { propsData })
    }

    it('has class "hc-badges"', () => {
      expect(Wrapper().find('.hc-badges').exists()).toBe(true)
    })

    describe('given a badge', () => {
      beforeEach(() => {
        propsData.badges = [{ id: '1', icon: '/path/to/some/icon' }]
      })

      it('proxies badge icon, which is just a URL without metadata', () => {
        expect(Wrapper().find('img[src="/api/path/to/some/icon"]').exists()).toBe(true)
      })
    })
  })
})
