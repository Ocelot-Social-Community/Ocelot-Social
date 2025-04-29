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
      mutate: jest
        .fn()
        .mockRejectedValue({ message: 'Ouch!' })
        .mockResolvedValue({
          data: {
            switchUserRole: {
              id: 'user',
              email: 'user@example.org',
              name: 'User',
              role: 'moderator',
              slug: 'user',
            },
          },
        }),
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
        User: [
          {
            id: 'user',
            email: 'user@example.org',
            name: 'User',
            role: 'moderator',
            slug: 'user',
          },
          {
            id: 'user2',
            email: 'user2@example.org',
            name: 'User',
            role: 'moderator',
            slug: 'user',
          },
        ],
      }),
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
      expect(wrapper.element).toMatchSnapshot()
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
      expect(wrapper.element).toMatchSnapshot()
    })
  })

  describe('search', () => {
    let searchAction
    beforeEach(() => {
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

      it('email address is case-insensitive', async () => {
        const wrapper = await searchAction(Wrapper(), { query: 'eMaiL@example.org' })
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

  describe('change roles', () => {
    beforeAll(() => {
      wrapper = Wrapper()
      wrapper.setData({
        User: [
          {
            id: 'admin',
            email: 'admin@example.org',
            name: 'Admin',
            role: 'admin',
            slug: 'admin',
          },
          {
            id: 'user',
            email: 'user@example.org',
            name: 'User',
            role: 'user',
            slug: 'user',
          },
        ],
        userRoles: ['user', 'moderator', 'admin'],
      })
    })

    it('cannot change own role', () => {
      const adminRow = wrapper.findAll('tr').at(1)
      expect(adminRow.find('select').exists()).toBe(false)
    })

    it('changes the role of another user', () => {
      const userRow = wrapper.findAll('tr').at(2)
      userRow.findAll('option').at(1).setSelected()
      expect(mocks.$apollo.mutate).toHaveBeenCalledWith(
        expect.objectContaining({
          variables: {
            id: 'user',
            role: 'moderator',
          },
        }),
      )
    })

    it('toasts a success message after role has changed', () => {
      const userRow = wrapper.findAll('tr').at(2)
      userRow.findAll('option').at(1).setSelected()
      expect(mocks.$toast.success).toHaveBeenCalled()
    })
  })
})
