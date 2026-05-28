import { mount, createLocalVue } from '@vue/test-utils'
import Vuex from 'vuex'
import EditId from './_id.vue'

const localVue = createLocalVue()
localVue.use(Vuex)

const Stub = (name, slot = false) => ({
  name,
  template: slot ? `<div class="stub-${name.toLowerCase()}"><slot /></div>` : `<div class="stub-${name.toLowerCase()}" />`,
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

const factory = (group = { id: 'g1', slug: 'g-slug', name: 'A Group' }) => {
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
    it('builds general / members / invites routes for the active group', () => {
      const { wrapper } = factory({ id: 'g1', slug: 's', name: 'n' })
      expect(wrapper.vm.routes).toEqual([
        { name: 'group.general', path: '/groups/edit/g1' },
        { name: 'group.members', path: '/groups/edit/g1/members' },
        { name: 'group.invite-links', path: '/groups/edit/g1/invites' },
      ])
    })

    it('updates when the group id changes', async () => {
      const { wrapper } = factory({ id: 'g1', slug: 's', name: 'n' })
      wrapper.setData({ group: { id: 'g9', slug: 's', name: 'n' } })
      await wrapper.vm.$nextTick()
      expect(wrapper.vm.routes.map((r) => r.path)).toEqual([
        '/groups/edit/g9',
        '/groups/edit/g9/members',
        '/groups/edit/g9/invites',
      ])
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
    const buildContext = ({ group, errorFn = jest.fn() } = {}) => {
      const query = jest.fn().mockResolvedValue({ data: { Group: [group] } })
      return {
        app: { apolloProvider: { defaultClient: { query } } },
        error: errorFn,
        params: { id: 'g1' },
        query,
        errorFn,
      }
    }

    it('returns the loaded group when the current user owns it', async () => {
      const ctx = buildContext({ group: { id: 'g1', myRole: 'owner', name: 'Mine' } })
      const result = await EditId.asyncData(ctx)
      expect(ctx.query).toHaveBeenCalled()
      expect(result).toEqual({ group: { id: 'g1', myRole: 'owner', name: 'Mine' } })
      expect(ctx.errorFn).not.toHaveBeenCalled()
    })

    it('triggers error(403) when the current user is not the owner', async () => {
      const ctx = buildContext({ group: { id: 'g1', myRole: 'usual' } })
      await EditId.asyncData(ctx)
      expect(ctx.errorFn).toHaveBeenCalledWith({ statusCode: 403, message: 'NONONNNO' })
    })
  })
})
