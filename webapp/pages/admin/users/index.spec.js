import { mount } from '@vue/test-utils'
import Vuex from 'vuex'
import Users from './index.vue'

const localVue = global.localVue

const stubs = {
  'nuxt-link': true,
}

describe('Users', () => {
  let wrapper

  const mocks = {
    $t: jest.fn((t) => t),
    $apollo: {
      loading: false,
      mutate: jest.fn().mockResolvedValue({ data: {} }),
      queries: { User: { refetch: jest.fn().mockResolvedValue() } },
    },
    $toast: {
      error: jest.fn(),
      success: jest.fn(),
    },
  }

  const getters = {
    'auth/isAdmin': () => true,
    'auth/user': () => {
      return { id: 'admin' }
    },
  }

  const Wrapper = () => {
    const store = new Vuex.Store({ getters })
    return mount(Users, {
      mocks,
      localVue,
      store,
      stubs,
      data: () => ({
        allRoleNames: ['user', 'moderator', 'admin', 'owner', 'badge-setter'],
        User: [
          {
            id: 'user',
            email: 'user@example.org',
            name: 'User',
            roleName: 'moderator',
            slug: 'user',
          },
          {
            id: 'user2',
            email: 'user2@example.org',
            name: 'User',
            roleName: 'user',
            slug: 'user',
          },
        ],
      }),
    })
  }

  describe('given badges are enabled', () => {
    beforeEach(() => {
      mocks.$policy = { get: (key) => key === 'badgesEnabled' }
      wrapper = Wrapper()
    })

    it('renders', () => {
      expect(wrapper.element).toMatchSnapshot()
    })
  })

  describe('given badges are disabled', () => {
    beforeEach(() => {
      mocks.$policy = { get: () => false }
      wrapper = Wrapper()
    })

    it('renders', () => {
      expect(wrapper.element).toMatchSnapshot()
    })
  })

  describe('search', () => {
    let searchAction
    beforeEach(() => {
      mocks.$policy = { get: () => false }
      wrapper = Wrapper()
      searchAction = (wrapper, { query }) => {
        wrapper.find('input').setValue(query)
        wrapper.find('form').trigger('submit')
        return wrapper
      }
    })

    describe('query looks like an email address', () => {
      it('searches users for exact email address', async () => {
        const wrapper = await searchAction(Wrapper(), { query: 'email@example.org' })
        expect(wrapper.vm.email).toEqual('email@example.org')
        expect(wrapper.vm.filter).toBe(null)
      })
    })

    describe('query is just text', () => {
      it('tries to find matching users by `name`, `slug` or `about`', async () => {
        const wrapper = await searchAction(await Wrapper(), { query: 'Find me' })
        const expected = {
          OR: [
            { name_contains: 'Find me' },
            { slug_contains: 'Find me' },
            { about_contains: 'Find me' },
          ],
        }
        expect(wrapper.vm.email).toBe(null)
        expect(wrapper.vm.filter).toEqual(expected)
      })
    })
  })

  describe('role', () => {
    beforeEach(() => {
      mocks.$apollo.mutate.mockClear()
      mocks.$toast.success.mockClear()
      mocks.$policy = { get: () => false }
      wrapper = Wrapper()
    })

    it('shows a single role dropdown for other users', () => {
      expect(wrapper.find('[data-test="user-role-select-user"]').exists()).toBe(true)
    })

    it('does not offer a role dropdown for the current admin', () => {
      const store = new Vuex.Store({ getters })
      const own = mount(Users, {
        mocks,
        localVue,
        store,
        stubs,
        data: () => ({
          allRoleNames: ['user', 'admin'],
          User: [{ id: 'admin', name: 'Admin', role: 'admin', roleName: 'admin', slug: 'admin' }],
        }),
      })
      expect(own.find('[data-test="user-role-select-admin"]').exists()).toBe(false)
    })

    it('sets the selected single role', () => {
      const select = wrapper.find('[data-test="user-role-select-user"]')
      // options follow allRoleNames; pick 'admin' (index 2)
      select.findAll('option').at(2).setSelected()
      expect(mocks.$apollo.mutate).toHaveBeenCalledWith(
        expect.objectContaining({ variables: { userId: 'user', roleName: 'admin' } }),
      )
    })

    it('toasts a success message after a change', async () => {
      await wrapper.vm.setRole({ id: 'user' }, { target: { value: 'admin' } })
      expect(mocks.$toast.success).toHaveBeenCalled()
    })
  })
})
