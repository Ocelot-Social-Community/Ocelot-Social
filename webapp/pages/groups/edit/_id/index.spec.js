import { mount, createLocalVue } from '@vue/test-utils'
import Index from './index.vue'

const localVue = createLocalVue()

const Stub = (name) => ({
  name,
  template: `<div class="stub-${name.toLowerCase()}"><slot /></div>`,
})

const stubs = {
  OsCard: Stub('OsCard'),
  GroupForm: Stub('GroupForm'),
}

const factory = (mutate = jest.fn().mockResolvedValue()) => {
  const $toast = { success: jest.fn(), error: jest.fn() }
  const $router = { push: jest.fn() }
  const $apollo = { mutate }
  const wrapper = mount(Index, {
    localVue,
    propsData: { group: { id: 'g1' } },
    stubs,
    mocks: {
      $t: (k) => k,
      $toast,
      $router,
      $apollo,
    },
  })
  return { wrapper, mutate, $toast, $router }
}

const samplePayload = {
  id: 'g1',
  slug: 'old-slug',
  name: 'Old Name',
  about: 'about',
  description: 'description',
  groupType: 'public',
  actionRadius: 'regional',
  locationName: 'Berlin',
  categoryIds: ['c1'],
}

describe('pages/groups/edit/_id/index.vue', () => {
  it('renders the GroupForm inside an OsCard', () => {
    const { wrapper } = factory()
    expect(wrapper.find('.stub-oscard').exists()).toBe(true)
    expect(wrapper.find('.stub-groupform').exists()).toBe(true)
  })

  describe('updateGroup', () => {
    it('passes the form values straight through as mutation variables', async () => {
      const mutate = jest.fn().mockImplementation(({ update }) => {
        update(null, { data: { UpdateGroup: { id: 'g1', slug: 'new-slug' } } })
        return Promise.resolve()
      })
      const { wrapper } = factory(mutate)
      await wrapper.vm.updateGroup(samplePayload)
      expect(mutate).toHaveBeenCalled()
      const arg = mutate.mock.calls[0][0]
      expect(arg.variables).toEqual({
        id: 'g1',
        name: 'Old Name',
        slug: 'old-slug',
        about: 'about',
        description: 'description',
        groupType: 'public',
        actionRadius: 'regional',
        locationName: 'Berlin',
        categoryIds: ['c1'],
      })
    })

    it('navigates to the new slug on success', async () => {
      const mutate = jest.fn().mockImplementation(({ update }) => {
        update(null, { data: { UpdateGroup: { id: 'g1', slug: 'fresh-slug' } } })
        return Promise.resolve()
      })
      const { wrapper, $router, $toast } = factory(mutate)
      await wrapper.vm.updateGroup(samplePayload)
      expect($toast.success).toHaveBeenCalledWith('group.updatedGroup')
      expect($router.push).toHaveBeenCalledWith({
        name: 'groups-id-slug',
        params: { id: 'g1', slug: 'fresh-slug' },
      })
    })

    it('surfaces mutation errors via toast and does not navigate', async () => {
      const mutate = jest.fn().mockRejectedValue(new Error('boom'))
      const { wrapper, $router, $toast } = factory(mutate)
      await wrapper.vm.updateGroup(samplePayload)
      expect($toast.error).toHaveBeenCalledWith('boom')
      expect($router.push).not.toHaveBeenCalled()
    })

    it('is wired up to the @updateGroup event from GroupForm', async () => {
      const mutate = jest.fn().mockImplementation(({ update }) => {
        update(null, { data: { UpdateGroup: { id: 'g1', slug: 's' } } })
        return Promise.resolve()
      })
      const { wrapper } = factory(mutate)
      wrapper.findComponent({ name: 'GroupForm' }).vm.$emit('updateGroup', samplePayload)
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()
      expect(mutate).toHaveBeenCalled()
    })
  })
})
