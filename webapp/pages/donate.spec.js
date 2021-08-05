import { mount } from '@vue/test-utils'
import Donate from './donate.vue'
import VueMeta from 'vue-meta'

const localVue = global.localVue
localVue.use(VueMeta, { keyName: 'head' })

describe('donate.vue', () => {
  let wrapper
  let mocks

  beforeEach(() => {
    mocks = {
      $t: (t) => t,
    }
  })

  describe('mount', () => {
    const Wrapper = () => {
      return mount(Donate, {
        mocks,
        localVue,
      })
    }

    beforeEach(() => {
      wrapper = Wrapper()
    })

    it('renders', () => {
      expect(wrapper.is('div')).toBeTruthy()
    })

    it('has correct <head> content', () => {
      expect(wrapper.vm.$metaInfo.title).toBe('site.donate')
    })
  })
})
