import { mount } from '@vue/test-utils'
import changePassword from './change-password'

const localVue = global.localVue

describe('change-password', () => {
  let wrapper
  let mocks

  beforeEach(() => {
    mocks = {
      $t: jest.fn(),
      $route: {
        query: jest.fn().mockResolvedValue({ email: 'peter@lustig.de', nonce: '12345' }),
      },
      $apollo: {
        loading: false,
      },
    }
  })

  describe('mount', () => {
    const Wrapper = () => {
      return mount(changePassword, { mocks, localVue })
    }

    beforeEach(() => {
      wrapper = Wrapper()
    })

    it('renders', () => {
      expect(wrapper.findAll('.ds-form')).toHaveLength(1)
    })
  })
})
