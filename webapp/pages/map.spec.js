import { mount } from '@vue/test-utils'
// import Map from './map.vue'
import VueMeta from 'vue-meta'

const localVue = global.localVue
localVue.use(VueMeta, { keyName: 'head' })

// try to solve error "TypeError: window.URL.createObjectURL is not a function"
// window.URL.createObjectURL = jest.fn()

// avoid: 'Error: Not implemented: navigation (except hash changes)', see https://stackoverflow.com/questions/54090231/how-to-fix-error-not-implemented-navigation-except-hash-changes
const assignMock = jest.fn()
delete window.location
window.location = { assign: assignMock }

const openMock = jest.fn()
delete window.open
window.open = openMock

describe.skip('map', () => {
  let wrapper
  let mocks

  beforeEach(() => {
    mocks = {
      $t: (t) => t,
    }
  })

  describe('mount', () => {
    const Wrapper = () => {
      return mount(Map, {
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

    it.skip('has correct <head> content', () => {
      // set correct after solving error above
      expect(wrapper.vm.$metaInfo.title).toBe('site.imprint')
    })
  })
})
