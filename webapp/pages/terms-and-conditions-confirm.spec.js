import { config, mount } from '@vue/test-utils'
import TermsAndConditionsConfirm from './terms-and-conditions-confirm.vue'
import VueMeta from 'vue-meta'

const localVue = global.localVue
localVue.use(VueMeta, { keyName: 'head' })

config.stubs['nuxt-link'] = '<span class="nuxt-link"><slot /></span>'

describe('terms-and-conditions-confirm.vue', () => {
  let wrapper
  let mocks

  beforeEach(() => {
    mocks = {
      $t: (t) => t,
    }
  })

  describe('mount', () => {
    const Wrapper = () => {
      return mount(TermsAndConditionsConfirm, {
        mocks,
        localVue,
      })
    }

    beforeEach(() => {
      wrapper = Wrapper()
    })

    it('renders', () => {
      expect(wrapper.is('div')).toBe(true)
    })

    it('has correct <head> content', () => {
      expect(wrapper.vm.$metaInfo.title).toBe('termsAndConditions.newTermsAndConditions')
    })
  })
})
