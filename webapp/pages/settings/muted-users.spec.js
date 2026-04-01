import { mount, createLocalVue } from '@vue/test-utils'
import MutedUsers from './muted-users.vue'
import Filters from '~/plugins/vue-filters'
import { unmuteUser } from '~/graphql/settings/MutedUsers'

const localVue = createLocalVue()

localVue.use(Filters)

const stubs = {
  'nuxt-link': true,
}

describe('muted-users.vue', () => {
  let wrapper
  let mocks

  beforeEach(() => {
    mocks = {
      $t: jest.fn(),
      $apollo: {
        mutate: jest.fn(),
        queries: {
          mutedUsers: {
            refetch: jest.fn(),
          },
        },
      },
      $toast: {
        error: jest.fn(),
        success: jest.fn(),
      },
    }
  })

  describe('mount', () => {
    const Wrapper = () => {
      return mount(MutedUsers, { mocks, localVue, stubs })
    }

    beforeEach(() => {
      wrapper = Wrapper()
    })

    it('renders', () => {
      expect(wrapper.element.tagName).toBe('DIV')
    })

    describe('given a list of muted users', () => {
      beforeEach(() => {
        const mutedUsers = [{ id: 'u1', name: 'John Doe', slug: 'john-doe' }]
        wrapper.setData({ mutedUsers })
      })

      describe('click unmute', () => {
        beforeEach(() => {
          mocks.$apollo.mutate.mockResolvedValue({})
          wrapper.find('[data-test="unmute-btn"]').trigger('click')
        })

        it('calls unmute mutation with given user', () => {
          expect(mocks.$apollo.mutate).toHaveBeenCalledWith({
            mutation: unmuteUser(),
            variables: { id: 'u1' },
          })
        })
      })

      describe('when unmute fails', () => {
        beforeEach(async () => {
          mocks.$apollo.mutate.mockRejectedValue(new Error('Network error'))
          await wrapper.find('[data-test="unmute-btn"]').trigger('click')
          await wrapper.vm.$nextTick()
        })

        it('shows error toast', () => {
          expect(mocks.$toast.error).toHaveBeenCalledWith('Network error')
        })
      })
    })
  })
})
