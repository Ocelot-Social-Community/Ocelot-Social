import { mount, createLocalVue } from '@vue/test-utils'
import Vuex from 'vuex'
import EditId from './_id.vue'

const localVue = createLocalVue()
localVue.use(Vuex)

const Stub = (name, slot = false) => ({
  name,
  template: slot
    ? `<div class="stub-${name.toLowerCase()}"><slot /></div>`
    : `<div class="stub-${name.toLowerCase()}" />`,
})

const stubs = {
  OsMenu: Stub('OsMenu'),
  'nuxt-link': Stub('NuxtLink', true),
  'nuxt-child': Stub('NuxtChild'),
}

const buildStore = (user = { id: 'u1', name: 'User' }) =>
  new Vuex.Store({
    getters: {
      'auth/user': () => user,
    },
  })

const OWNER_RIGHTS = [
  'group.settings.manage',
  'group.member.approve',
  'group.member.remove',
  'group.member.role.assign',
  'group.invite',
  'group.role.manage',
]

const factory = (
  group = { id: 'g1', slug: 'g-slug', name: 'A Group', myGroupPermissions: OWNER_RIGHTS },
) => {
  const wrapper = mount(EditId, {
    localVue,
    store: buildStore(),
    stubs,
    mocks: {
      $t: (k) => k,
    },
    data: () => ({ group }),
  })
  return { wrapper }
}

describe('pages/groups/edit/_id.vue', () => {
  describe('rendering', () => {
    it('mounts the layout with title, sidebar menu and child container', () => {
      const { wrapper } = factory()
      expect(wrapper.find('.stub-osmenu').exists()).toBe(true)
      expect(wrapper.find('.stub-nuxtchild').exists()).toBe(true)
    })
  })

  describe('routes computed', () => {
    it('builds general / members / invites / rights routes for the active group', () => {
      const { wrapper } = factory({
        id: 'g1',
        slug: 's',
        name: 'n',
        myGroupPermissions: OWNER_RIGHTS,
      })
      expect(wrapper.vm.routes).toEqual([
        { name: 'group.general', path: '/groups/edit/g1' },
        { name: 'group.members', path: '/groups/edit/g1/members' },
        { name: 'group.invite-links', path: '/groups/edit/g1/invites' },
        { name: 'group.rights.title', path: '/groups/edit/g1/rights' },
      ])
    })

    it('updates when the group id changes', async () => {
      const { wrapper } = factory({
        id: 'g1',
        slug: 's',
        name: 'n',
        myGroupPermissions: OWNER_RIGHTS,
      })
      wrapper.setData({
        group: { id: 'g9', slug: 's', name: 'n', myGroupPermissions: OWNER_RIGHTS },
      })
      await wrapper.vm.$nextTick()
      expect(wrapper.vm.routes.map((r) => r.path)).toEqual([
        '/groups/edit/g9',
        '/groups/edit/g9/members',
        '/groups/edit/g9/invites',
        '/groups/edit/g9/rights',
      ])
    })

    it('offers only the tabs the viewer holds a right for', () => {
      // The case the group content menu produces: an ordinary member of a public group holds
      // group.invite and nothing else. They used to be sent to a 403 by a link the app itself
      // had just shown them.
      const { wrapper } = factory({
        id: 'g1',
        slug: 's',
        name: 'n',
        myGroupPermissions: ['group.invite'],
      })
      expect(wrapper.vm.routes).toEqual([
        { name: 'group.invite-links', path: '/groups/edit/g1/invites' },
      ])
    })

    it('shows the members tab for any one of the member-management rights', () => {
      const { wrapper } = factory({
        id: 'g1',
        slug: 's',
        name: 'n',
        myGroupPermissions: ['group.member.approve'],
      })
      expect(wrapper.vm.routes.map((route) => route.path)).toEqual(['/groups/edit/g1/members'])
    })
  })

  describe('updateInviteCodes', () => {
    it('writes the new invite codes onto the group object', () => {
      const { wrapper } = factory()
      const codes = [{ code: 'a' }, { code: 'b' }]
      wrapper.vm.updateInviteCodes(codes)
      expect(wrapper.vm.group.inviteCodes).toEqual(codes)
    })

    it('is wired to the @update-invite-codes event from nuxt-child', async () => {
      const { wrapper } = factory()
      wrapper.findComponent({ name: 'NuxtChild' }).vm.$emit('update-invite-codes', [{ code: 'x' }])
      await wrapper.vm.$nextTick()
      expect(wrapper.vm.group.inviteCodes).toEqual([{ code: 'x' }])
    })
  })

  describe('asyncData', () => {
    const buildContext = ({ group, errorFn = jest.fn(), path = '/groups/edit/g1' } = {}) => {
      const query = jest.fn().mockResolvedValue({ data: { Group: [group] } })
      return {
        app: { apolloProvider: { defaultClient: { query } } },
        error: errorFn,
        params: { id: 'g1' },
        route: { path },
        query,
        errorFn,
      }
    }

    it('returns the loaded group when the viewer may open the tab they asked for', async () => {
      const ctx = buildContext({
        group: { id: 'g1', myGroupPermissions: ['group.settings.manage'], name: 'Mine' },
      })
      const result = await EditId.asyncData(ctx)
      expect(ctx.query).toHaveBeenCalled()
      expect(result).toEqual({
        group: { id: 'g1', myGroupPermissions: ['group.settings.manage'], name: 'Mine' },
      })
      expect(ctx.errorFn).not.toHaveBeenCalled()
    })

    it('triggers error(403) when the viewer holds no right in this group at all', async () => {
      const ctx = buildContext({ group: { id: 'g1', myGroupPermissions: [] } })
      await EditId.asyncData(ctx)
      expect(ctx.errorFn).toHaveBeenCalledWith({ statusCode: 403, message: 'NONONNNO' })
    })

    it('lets an invite-only member open the invite tab', async () => {
      const ctx = buildContext({
        group: { id: 'g1', myGroupPermissions: ['group.invite'] },
        path: '/groups/edit/g1/invites',
      })
      await EditId.asyncData(ctx)
      expect(ctx.errorFn).not.toHaveBeenCalled()
    })

    it('still refuses that member the settings tab', async () => {
      const ctx = buildContext({
        group: { id: 'g1', myGroupPermissions: ['group.invite'] },
        path: '/groups/edit/g1',
      })
      await EditId.asyncData(ctx)
      expect(ctx.errorFn).toHaveBeenCalledWith({ statusCode: 403, message: 'NONONNNO' })
    })

    it('refuses the rights tab without group.role.manage', async () => {
      const ctx = buildContext({
        group: { id: 'g1', myGroupPermissions: ['group.settings.manage'] },
        path: '/groups/edit/g1/rights',
      })
      await EditId.asyncData(ctx)
      expect(ctx.errorFn).toHaveBeenCalledWith({ statusCode: 403, message: 'NONONNNO' })
    })

    it('falls back to "any tab at all" for a path it does not recognise', async () => {
      // A trailing slash, a nested route added later: the shell must not 403 somebody who
      // clearly may be here, and must still refuse somebody who may not.
      const ctx = buildContext({
        group: { id: 'g1', myGroupPermissions: ['group.invite'] },
        path: '/groups/edit/g1/something-new',
      })
      await EditId.asyncData(ctx)
      expect(ctx.errorFn).not.toHaveBeenCalled()
    })
  })
})
