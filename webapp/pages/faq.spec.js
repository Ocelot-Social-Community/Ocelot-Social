import { mount } from '@vue/test-utils'
import Faq from './faq.vue'
import VueMeta from 'vue-meta'

const localVue = global.localVue
localVue.use(VueMeta, { keyName: 'head' })

// avoid: 'Error: Not implemented: navigation (except hash changes)', see https://stackoverflow.com/questions/54090231/how-to-fix-error-not-implemented-navigation-except-hash-changes
const assignMock = jest.fn()
delete window.location
window.location = { assign: assignMock }

describe('faq.vue', () => {
  let wrapper
  let mocks

  beforeEach(() => {
    mocks = {
      $t: (t) => t,
    }
  })

  describe('mount', () => {
    const Wrapper = () => {
      return mount(Faq, {
        mocks,
        localVue,
      })
    }

    beforeEach(() => {
      wrapper = Wrapper()
    })

    it('renders', () => {
      expect(wrapper.element.tagName).toBe('DIV')
    })

    it('has correct <head> content', () => {
      expect(wrapper.vm.$metaInfo.title).toBe('site.faq')
    })
  })
})
