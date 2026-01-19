import { mount } from '@vue/test-utils'
import Static from './_static.vue'

const localVue = global.localVue

describe('_static', () => {
  let wrapper

  describe('mount', () => {
    const Wrapper = (page) => {
      return mount(Static, {
        mocks: {
          $t: jest.fn(),
        },
        data() {
          return {
            pageParams: {
              internalPage: {
                hasContainer: true,
                hasBaseCard: true,
                hasLoginInHeader: true,
              },
            },
          }
        },
        localVue,
      })
    }

    beforeEach(async () => {
      wrapper = await Wrapper('faq')
    })

    it('renders', () => {
      expect(wrapper.element).toMatchSnapshot()
    })
  })
})
