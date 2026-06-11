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
            role: 'moderator',
            roleNames: ['moderator'],
            slug: 'user',
          },
          {
            id: 'user2',
            email: 'user2@example.org',
            name: 'User',
            role: 'user',
            roleNames: [],
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

  describe('role assignment', () => {
    beforeEach(() => {
      mocks.$apollo.mutate.mockClear()
      mocks.$toast.success.mockClear()
      mocks.$policy = { get: () => false }
      wrapper = Wrapper()
      wrapper.setData({
        allRoleNames: ['user', 'moderator', 'admin', 'owner', 'badge-setter'],
        User: [
          {
            id: 'admin',
            email: 'admin@example.org',
            name: 'Admin',
            role: 'admin',
            roleNames: ['admin'],
            slug: 'admin',
          },
          {
            id: 'user',
            email: 'user@example.org',
            name: 'User',
            role: 'user',
            roleNames: ['badge-setter'],
            slug: 'user',
          },
        ],
      })
    })

    it('excludes owner, the baseline user role and already-held roles from the assignable list', () => {
      const target = wrapper.vm.User.find((u) => u.id === 'user')
      expect(wrapper.vm.assignableRoles(target)).toEqual(['moderator', 'admin'])
    })

    it('offers no assignment controls for the current admin row', () => {
      const adminRow = wrapper.findAll('tr').at(1)
      expect(adminRow.find('[data-test="user-role-add-admin"]').exists()).toBe(false)
      expect(adminRow.find('.user-roles__remove').exists()).toBe(false)
    })

    it('assigns a selected role to another user', () => {
      const select = wrapper.find('[data-test="user-role-add-user"]')
      // options: [placeholder, moderator, admin] → pick moderator
      select.findAll('option').at(1).setSelected()
      expect(mocks.$apollo.mutate).toHaveBeenCalledWith(
        expect.objectContaining({ variables: { userId: 'user', roleName: 'moderator' } }),
      )
    })

    it('unassigns a held role via the chip remove button', async () => {
      const chip = wrapper.find('[data-test="user-role-user-badge-setter"]')
      await chip.find('.user-roles__remove').trigger('click')
      expect(mocks.$apollo.mutate).toHaveBeenCalledWith(
        expect.objectContaining({ variables: { userId: 'user', roleName: 'badge-setter' } }),
      )
    })

    it('toasts a success message after a change', async () => {
      await wrapper.vm.unassign({ id: 'user' }, 'badge-setter')
      expect(mocks.$toast.success).toHaveBeenCalled()
    })
  })
})
