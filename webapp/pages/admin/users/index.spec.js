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
    $route: { query: {} },
    $router: { replace: jest.fn(() => Promise.resolve()) },
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
      it('searches a full e-mail as free text too (partial match, no exact-only case)', async () => {
        const wrapper = await searchAction(Wrapper(), { query: 'email@example.org' })
        expect(wrapper.vm.searchText).toEqual('email@example.org')
      })
    })

    describe('query is just text', () => {
      it('searches by free text (combinable with the role filter)', async () => {
        const wrapper = await searchAction(await Wrapper(), { query: 'Find me' })
        expect(wrapper.vm.searchText).toEqual('Find me')
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

    const optionValues = (select) =>
      select.findAll('option').wrappers.map((option) => option.attributes('value'))

    it('hides the owner option from a non-owner admin', () => {
      const select = wrapper.find('[data-test="user-role-select-user"]')
      expect(optionValues(select)).not.toContain('owner')
    })

    it('does not let a non-owner admin change an owner', () => {
      const store = new Vuex.Store({ getters })
      const w = mount(Users, {
        mocks,
        localVue,
        store,
        stubs,
        data: () => ({
          allRoleNames: ['user', 'admin', 'owner'],
          User: [{ id: 'theowner', name: 'Owner', roleName: 'owner', slug: 'owner' }],
        }),
      })
      expect(w.find('[data-test="user-role-select-theowner"]').exists()).toBe(false)
    })

    it('parses a role:<name> token from the search box, combinable with free text', () => {
      wrapper.vm.formData.query = 'role:moderator anna'
      wrapper.vm.onSubmit()
      expect(wrapper.vm.roleFilter).toBe('moderator')
      expect(wrapper.vm.searchText).toBe('anna')
    })

    it('resolves the role token case-insensitively against the known roles', () => {
      wrapper.vm.formData.query = 'role:Moderator'
      wrapper.vm.onSubmit()
      expect(wrapper.vm.roleFilter).toBe('moderator')
    })

    it('syncs the search string to the URL as ?q=', () => {
      mocks.$router.replace.mockClear()
      wrapper.vm.formData.query = 'role:moderator anna'
      wrapper.vm.onSubmit()
      expect(mocks.$router.replace).toHaveBeenCalledWith({
        query: { q: 'role:moderator anna' },
      })
    })

    it('passes roleName to the query when a role filter is set', () => {
      wrapper.vm.roleFilter = 'moderator'
      const vars = wrapper.vm.$options.apollo.User.variables.call(wrapper.vm)
      expect(vars.roleName).toBe('moderator')
    })

    it('combines role and free-text search in the query variables', () => {
      wrapper.vm.roleFilter = 'moderator'
      wrapper.vm.searchText = 'anna'
      const vars = wrapper.vm.$options.apollo.User.variables.call(wrapper.vm)
      expect(vars.roleName).toBe('moderator')
      expect(vars.search).toBe('anna')
    })

    it('restores the search string (and parsed role) from the URL ?q=', () => {
      mocks.$route = { query: { q: 'role:admin anna' } }
      const w = Wrapper()
      expect(w.vm.formData.query).toBe('role:admin anna')
      expect(w.vm.roleFilter).toBe('admin')
      expect(w.vm.searchText).toBe('anna')
      mocks.$route = { query: {} }
    })

    it('handles a repeated ?q=a&q=b param (array) without crashing on init', () => {
      mocks.$route = { query: { q: ['role:user', 'role:admin anna'] } }
      const w = Wrapper()
      // Last value wins; parsing still yields a string-based filter.
      expect(w.vm.formData.query).toBe('role:admin anna')
      expect(w.vm.roleFilter).toBe('admin')
      expect(w.vm.searchText).toBe('anna')
      mocks.$route = { query: {} }
    })

    it('normalises a deep-linked role token to canonical casing once role names load', async () => {
      mocks.$route = { query: { q: 'role:Owner' } }
      const store = new Vuex.Store({ getters })
      const w = mount(Users, {
        mocks,
        localVue,
        store,
        stubs,
        data: () => ({ allRoleNames: [], User: [] }),
      })
      expect(w.vm.roleFilter).toBe('Owner') // raw, before the known role names arrive
      await w.setData({ allRoleNames: ['user', 'admin', 'owner'] })
      expect(w.vm.roleFilter).toBe('owner') // snapped to the canonical casing
      mocks.$route = { query: {} }
    })

    it('lets an owner edit an owner and offers the owner option', () => {
      const ownerGetters = {
        'auth/isAdmin': () => true,
        'auth/user': () => ({ id: 'me', roleName: 'owner' }),
      }
      const store = new Vuex.Store({ getters: ownerGetters })
      const w = mount(Users, {
        mocks,
        localVue,
        store,
        stubs,
        data: () => ({
          allRoleNames: ['user', 'admin', 'owner'],
          User: [{ id: 'theowner', name: 'Owner', roleName: 'owner', slug: 'owner' }],
        }),
      })
      const select = w.find('[data-test="user-role-select-theowner"]')
      expect(select.exists()).toBe(true)
      expect(optionValues(select)).toContain('owner')
    })
  })
})
