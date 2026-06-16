import { mount } from '@vue/test-utils'
import Vuex from 'vuex'
import UserList from './UserList.vue'

const localVue = global.localVue

const stubs = {
  'nuxt-link': true,
  // Stubbed: delete tests assert on state/callbacks, not the modal's rendering.
  ConfirmModal: true,
}

describe('UserList', () => {
  let wrapper
  let mocks

  // A fresh mock set per test: the component mutates $route/$policy (and tests assert
  // on the $apollo/$toast/$router spies), so sharing one object across tests would make
  // them order-dependent and flaky. Rebuild before each test instead.
  const createMocks = () => ({
    $t: jest.fn((t) => t),
    // Admin context by default: may read any email and manage roles. Gating tests
    // override this to deny one or both.
    $can: jest.fn(() => true),
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
  })

  beforeEach(() => {
    mocks = createMocks()
  })

  const getters = {
    'auth/isAdmin': () => true,
    'auth/user': () => {
      return { id: 'admin' }
    },
  }

  const Wrapper = (options = {}) => {
    const store = new Vuex.Store({ getters })
    return mount(UserList, {
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
      ...options,
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

    it('links the badge button to the configured badge route', () => {
      const w = Wrapper({ propsData: { badgeRouteName: 'moderation-users-id' } })
      expect(w.vm.badgeRouteName).toBe('moderation-users-id')
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

  describe('permission gating', () => {
    beforeEach(() => {
      mocks.$policy = { get: (key) => key === 'badgesEnabled' }
    })

    // The requested field names of the User selection (robust against the always-present
    // $roleName filter variable, which is not a field).
    const userFields = (w) => {
      const doc = w.vm.$options.apollo.User.query.call(w.vm)
      const userField = doc.definitions[0].selectionSet.selections[0]
      return userField.selectionSet.selections.map((selection) => selection.name.value)
    }

    describe('a viewer with both rights (admin)', () => {
      beforeEach(() => {
        mocks.$can = jest.fn(() => true)
        wrapper = Wrapper()
      })

      it('shows the email, role, badge and delete columns', () => {
        expect(wrapper.find('[data-test="user-role-select-user"]').exists()).toBe(true)
        expect(wrapper.text()).toContain('user@example.org')
        expect(wrapper.text()).toContain('admin.users.table.columns.badges')
        expect(wrapper.find('[data-test="user-delete-user"]').exists()).toBe(true)
      })

      it('requests the email and roleName fields', () => {
        const fields = userFields(wrapper)
        expect(fields).toContain('email')
        expect(fields).toContain('roleName')
      })

      it('does not skip the roles query', () => {
        expect(wrapper.vm.$options.apollo.allRoleNames.skip.call(wrapper.vm)).toBe(false)
      })
    })

    describe('a viewer without email/role rights (moderator)', () => {
      beforeEach(() => {
        // Deny both user.email.readAny and role.manage.
        mocks.$can = jest.fn(() => false)
        wrapper = Wrapper()
      })

      it('hides the email column', () => {
        expect(wrapper.text()).not.toContain('user@example.org')
      })

      it('hides the role column (no role dropdown)', () => {
        expect(wrapper.find('[data-test="user-role-select-user"]').exists()).toBe(false)
      })

      it('omits the email and roleName fields from the query', () => {
        const fields = userFields(wrapper)
        expect(fields).not.toContain('email')
        expect(fields).not.toContain('roleName')
      })

      it('skips the role.manage-gated roles query', () => {
        expect(wrapper.vm.$options.apollo.allRoleNames.skip.call(wrapper.vm)).toBe(true)
      })

      it('hides the badge column (no badge.manage)', () => {
        expect(wrapper.text()).not.toContain('admin.users.table.columns.badges')
      })

      it('hides the delete column (no user.delete.any)', () => {
        expect(wrapper.find('[data-test="user-delete-user"]').exists()).toBe(false)
      })
    })

    describe('a viewer with only user.delete.any (delete-capable moderator)', () => {
      beforeEach(() => {
        mocks.$can = jest.fn((permission) => permission === 'user.delete.any')
        wrapper = Wrapper()
      })

      it('shows the delete column but not badges/email/role', () => {
        expect(wrapper.find('[data-test="user-delete-user"]').exists()).toBe(true)
        expect(wrapper.text()).not.toContain('admin.users.table.columns.badges')
        expect(wrapper.text()).not.toContain('user@example.org')
        expect(wrapper.find('[data-test="user-role-select-user"]').exists()).toBe(false)
      })
    })
  })

  describe('delete user', () => {
    beforeEach(() => {
      mocks.$policy = { get: () => false }
    })

    it('shows a delete button for other users', () => {
      const w = Wrapper()
      expect(w.find('[data-test="user-delete-user"]').exists()).toBe(true)
    })

    it('hides the delete button on the current user own row', () => {
      const w = Wrapper({
        data: () => ({
          allRoleNames: [],
          User: [{ id: 'admin', name: 'Admin', slug: 'admin' }],
        }),
      })
      expect(w.find('[data-test="user-delete-admin"]').exists()).toBe(false)
    })

    it('opens a confirmation modal instead of deleting immediately', () => {
      const w = Wrapper()
      w.vm.confirmDeleteUser({ id: 'user', name: 'User' })
      expect(w.vm.showConfirmModal).toBe(true)
      expect(mocks.$apollo.mutate).not.toHaveBeenCalled()
    })

    it('deletes the account (empty resource) when confirmed', async () => {
      const w = Wrapper()
      w.vm.confirmDeleteUser({ id: 'user', name: 'User' })
      await w.vm.confirmModalData.buttons.confirm.callback()
      expect(mocks.$apollo.mutate).toHaveBeenCalledWith(
        expect.objectContaining({ variables: { id: 'user', resource: [] } }),
      )
      expect(mocks.$toast.success).toHaveBeenCalled()
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
      mocks.$policy = { get: () => false }
      wrapper = Wrapper()
    })

    it('shows a single role dropdown for other users', () => {
      expect(wrapper.find('[data-test="user-role-select-user"]').exists()).toBe(true)
    })

    it('does not offer a role dropdown for the current admin', () => {
      const store = new Vuex.Store({ getters })
      const own = mount(UserList, {
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

    it('sets the selected single role', async () => {
      const select = wrapper.find('[data-test="user-role-select-user"]')
      // options follow allRoleNames; pick 'admin' (index 2)
      await select.findAll('option').at(2).setSelected()
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
      const w = mount(UserList, {
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
    })

    it('handles a repeated ?q=a&q=b param (array) without crashing on init', () => {
      mocks.$route = { query: { q: ['role:user', 'role:admin anna'] } }
      const w = Wrapper()
      // Last value wins; parsing still yields a string-based filter.
      expect(w.vm.formData.query).toBe('role:admin anna')
      expect(w.vm.roleFilter).toBe('admin')
      expect(w.vm.searchText).toBe('anna')
    })

    it('normalises a deep-linked role token to canonical casing once role names load', async () => {
      mocks.$route = { query: { q: 'role:Owner' } }
      const store = new Vuex.Store({ getters })
      const w = mount(UserList, {
        mocks,
        localVue,
        store,
        stubs,
        data: () => ({ allRoleNames: [], User: [] }),
      })
      expect(w.vm.roleFilter).toBe('Owner') // raw, before the known role names arrive
      await w.setData({ allRoleNames: ['user', 'admin', 'owner'] })
      expect(w.vm.roleFilter).toBe('owner') // snapped to the canonical casing
    })

    it('lets an owner edit an owner and offers the owner option', () => {
      const ownerGetters = {
        'auth/isAdmin': () => true,
        'auth/user': () => ({ id: 'me', roleName: 'owner' }),
      }
      const store = new Vuex.Store({ getters: ownerGetters })
      const w = mount(UserList, {
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
