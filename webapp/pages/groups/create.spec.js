import { mount, createLocalVue } from '@vue/test-utils'
import Create from './create.vue'

const localVue = createLocalVue()

const Stub = (name, slot = false) => ({
  name,
  template: slot
    ? `<div class="stub-${name.toLowerCase()}"><slot /></div>`
    : `<div class="stub-${name.toLowerCase()}" />`,
})

const stubs = {
  OsCard: Stub('OsCard', true),
  GroupForm: Stub('GroupForm'),
}

const factory = (mutate = jest.fn().mockResolvedValue()) => {
  const $toast = { success: jest.fn(), error: jest.fn() }
  const $router = { push: jest.fn() }
  const $apollo = { mutate }
  const wrapper = mount(Create, {
    localVue,
    stubs,
    mocks: { $t: (k) => k, $toast, $router, $apollo },
  })
  return { wrapper, mutate, $toast, $router }
}

const samplePayload = {
  name: 'My Group',
  about: 'about',
  description: 'description text long enough',
  groupType: 'public',
  actionRadius: 'regional',
  locationName: 'Berlin',
  categoryIds: ['c1', 'c2'],
}

describe('pages/groups/create.vue', () => {
  it('renders the GroupForm inside an OsCard', () => {
    const { wrapper } = factory()
    expect(wrapper.find('.stub-oscard').exists()).toBe(true)
    expect(wrapper.find('.stub-groupform').exists()).toBe(true)
  })

  describe('createGroup', () => {
    it('passes the form values straight through as mutation variables', async () => {
      const mutate = jest.fn().mockImplementation(({ update }) => {
        update(null, { data: { CreateGroup: { id: 'g1', slug: 'my-group' } } })
        return Promise.resolve()
      })
      const { wrapper } = factory(mutate)
      await wrapper.vm.createGroup(samplePayload)
      expect(mutate).toHaveBeenCalled()
      expect(mutate.mock.calls[0][0].variables).toEqual({
        name: 'My Group',
        about: 'about',
        description: 'description text long enough',
        groupType: 'public',
        actionRadius: 'regional',
        locationName: 'Berlin',
        categoryIds: ['c1', 'c2'],
      })
    })

    it('navigates to the new group on success', async () => {
      const mutate = jest.fn().mockImplementation(({ update }) => {
        update(null, { data: { CreateGroup: { id: 'g1', slug: 'my-group' } } })
        return Promise.resolve()
      })
      const { wrapper, $router, $toast } = factory(mutate)
      await wrapper.vm.createGroup(samplePayload)
      expect($toast.success).toHaveBeenCalledWith('group.groupCreated')
      expect($router.push).toHaveBeenCalledWith({
        name: 'groups-id-slug',
        params: { id: 'g1', slug: 'my-group' },
      })
    })

    it('surfaces mutation errors via toast and does not navigate', async () => {
      const mutate = jest.fn().mockRejectedValue(new Error('boom'))
      const { wrapper, $router, $toast } = factory(mutate)
      const done = jest.fn()
      await wrapper.vm.createGroup(samplePayload, done)
      expect($toast.error).toHaveBeenCalledWith('boom')
      expect(done).toHaveBeenCalled()
      expect($router.push).not.toHaveBeenCalled()
    })

    it('is triggered by the @createGroup event from GroupForm', async () => {
      const mutate = jest.fn().mockImplementation(({ update }) => {
        update(null, { data: { CreateGroup: { id: 'g1', slug: 's' } } })
        return Promise.resolve()
      })
      const { wrapper } = factory(mutate)
      wrapper.findComponent({ name: 'GroupForm' }).vm.$emit('createGroup', samplePayload)
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()
      expect(mutate).toHaveBeenCalled()
    })
  })
})
