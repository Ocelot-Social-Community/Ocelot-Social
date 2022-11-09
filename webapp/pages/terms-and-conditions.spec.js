import { mount } from '@vue/test-utils'
import TermsAndConditions from './terms-and-conditions.vue'
import VueMeta from 'vue-meta'

const localVue = global.localVue
localVue.use(VueMeta, { keyName: 'head' })

// avoid: 'Error: Not implemented: navigation (except hash changes)', see https://stackoverflow.com/questions/54090231/how-to-fix-error-not-implemented-navigation-except-hash-changes
const assignMock = jest.fn()
delete window.location
window.location = { assign: assignMock }
delete window.open
window.open = jest.fn()

describe('terms-and-conditions.vue', () => {
  let wrapper
  let mocks

  beforeEach(() => {
    mocks = {
      $t: (t) => t,
    }
  })

  describe('mount', () => {
    const Wrapper = () => {
      return mount(TermsAndConditions, {
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
      expect(wrapper.vm.$metaInfo.title).toBe('site.termsAndConditions')
    })
  })
})
