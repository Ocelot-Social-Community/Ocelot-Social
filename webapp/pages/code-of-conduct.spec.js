import { mount } from '@vue/test-utils'
import CodeOfConduct from './code-of-conduct.vue'
import VueMeta from 'vue-meta'

const localVue = global.localVue
localVue.use(VueMeta, { keyName: 'head' })

describe('code-of-conduct.vue', () => {
  let wrapper
  let mocks

  beforeEach(() => {
    mocks = {
      $t: (t) => t,
    }
  })

  describe('mount', () => {
    const Wrapper = () => {
      return mount(CodeOfConduct, {
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
      expect(wrapper.vm.$metaInfo.title).toBe('site.code-of-conduct')
    })
  })
})
