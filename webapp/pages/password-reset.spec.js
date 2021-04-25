import { config, mount } from '@vue/test-utils'
import PasswordReset from './password-reset.vue'

const localVue = global.localVue

config.stubs['client-only'] = '<span class="client-only"><slot /></span>'
config.stubs['nuxt-child'] = '<span class="nuxt-child"><slot /></span>'

describe('password-reset.vue', () => {
  let wrapper
  let mocks

  beforeEach(() => {
    mocks = {
      $t: (t) => t,
      $i18n: {
        locale: () => 'en',
      },
    }
  })

  describe('mount', () => {
    const Wrapper = () => {
      return mount(PasswordReset, {
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
  })
})
