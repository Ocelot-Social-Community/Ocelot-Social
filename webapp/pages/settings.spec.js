import { render } from '@testing-library/vue'
import settings from './settings.vue'

const localVue = global.localVue

const stubs = {
  'nuxt-child': true,
}

describe('settings.vue', () => {
  let wrapper
  let mocks

  beforeEach(() => {
    mocks = {
      $t: jest.fn(),
    }
  })

  const Wrapper = () => {
    return render(settings, {
      mocks,
      localVue,
      stubs,
    })
  }

  describe('given badges are enabled', () => {
    beforeEach(() => {
      mocks.$env = {
        BADGES_ENABLED: true,
      }
      wrapper = Wrapper()
    })

    it('renders', () => {
      expect(wrapper.container).toMatchSnapshot()
    })
  })

  describe('given badges are disabled', () => {
    beforeEach(() => {
      mocks.$env = {
        BADGES_ENABLED: false,
      }
      wrapper = Wrapper()
    })

    it('renders', () => {
      expect(wrapper.container).toMatchSnapshot()
    })
  })
})
