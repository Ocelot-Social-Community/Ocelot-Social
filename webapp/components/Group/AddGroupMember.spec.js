import { mount, createLocalVue } from '@vue/test-utils'
import AddGroupMember from './AddGroupMember.vue'

// Drain the microtask queue so we can deterministically await fire-and-forget
// async chains like the one inside confirmModal() (which calls
// addMemberToGroup() without awaiting it).
const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0))

const localVue = createLocalVue()

const Stub = (name, opts = {}) => ({
  name,
  props: opts.props || [],
  template: opts.template || `<div class="stub-${name.toLowerCase()}"><slot /></div>`,
  methods: opts.methods || {},
})

const SelectUserSearchStub = {
  name: 'SelectUserSearch',
  props: ['id'],
  methods: {
    clear: jest.fn(),
  },
  template: '<div class="stub-search" />',
}

const OsModalStub = {
  name: 'OsModal',
  props: ['title', 'open'],
  template: `
    <div class="stub-modal">
      <slot />
      <slot name="footer" :confirm="() => $emit('confirm')" :cancel="() => $emit('cancel')" />
    </div>
  `,
}

const baseStubs = {
  OsButton: Stub('OsButton', { template: '<button class="stub-button" @click="$emit(\'click\')"><slot name="icon" /><slot /></button>' }),
  OsIcon: Stub('OsIcon'),
  OsModal: OsModalStub,
  SelectUserSearch: SelectUserSearchStub,
}

const factory = (props = {}, mutate = jest.fn().mockResolvedValue()) => {
  const $toast = { success: jest.fn(), error: jest.fn() }
  const $apollo = { mutate }
  const wrapper = mount(AddGroupMember, {
    propsData: {
      groupId: 'g1',
      groupMembers: [],
      ...props,
    },
    localVue,
    stubs: baseStubs,
    mocks: {
      $t: (k, vars) => (vars ? `${k}:${JSON.stringify(vars)}` : k),
      $toast,
      $apollo,
    },
  })
  // Replace ref clear with jest mock so we can assert
  wrapper.vm.$refs.selectUserSearch.clear = jest.fn()
  return { wrapper, $toast, mutate }
}

describe('AddGroupMember', () => {
  it('renders the search component', () => {
    const { wrapper } = factory()
    expect(wrapper.find('.stub-search').exists()).toBe(true)
    expect(wrapper.find('.stub-modal').exists()).toBe(false)
  })

  describe('selectUser', () => {
    it('opens the modal when the user is not yet a member', async () => {
      const { wrapper } = factory({ groupMembers: [] })
      wrapper.vm.selectUser({ id: 'u1', name: 'Alice' })
      await wrapper.vm.$nextTick()
      expect(wrapper.vm.isOpen).toBe(true)
      expect(wrapper.vm.user).toEqual({ id: 'u1', name: 'Alice' })
    })

    it('rejects already-members with a toast and clears search', () => {
      const { wrapper, $toast } = factory({ groupMembers: [{ id: 'u1' }] })
      wrapper.vm.selectUser({ id: 'u1', name: 'Alice' })
      expect($toast.error).toHaveBeenCalled()
      expect(wrapper.vm.$refs.selectUserSearch.clear).toHaveBeenCalled()
      expect(wrapper.vm.isOpen).toBe(false)
    })
  })

  describe('cancelModal', () => {
    it('closes the modal and clears the search', async () => {
      const { wrapper } = factory()
      wrapper.vm.user = { id: 'u1', name: 'Alice' }
      wrapper.vm.isOpen = true
      await wrapper.vm.$nextTick()
      wrapper.vm.cancelModal()
      expect(wrapper.vm.isOpen).toBe(false)
      expect(wrapper.vm.$refs.selectUserSearch.clear).toHaveBeenCalled()
    })
  })

  describe('closeModal', () => {
    it('closes the modal and clears the search', async () => {
      const { wrapper } = factory()
      wrapper.vm.user = { id: 'u1', name: 'Alice' }
      wrapper.vm.isOpen = true
      await wrapper.vm.$nextTick()
      wrapper.vm.closeModal()
      expect(wrapper.vm.isOpen).toBe(false)
      expect(wrapper.vm.$refs.selectUserSearch.clear).toHaveBeenCalled()
    })
  })

  describe('confirmModal', () => {
    it('calls the mutation, shows success, emits loadGroupMembers, and closes', async () => {
      const mutate = jest.fn().mockResolvedValue()
      const { wrapper, $toast } = factory({}, mutate)
      wrapper.vm.user = { id: 'u1', name: 'Alice' }
      wrapper.vm.isOpen = true
      await wrapper.vm.$nextTick()
      wrapper.vm.confirmModal()
      // confirmModal kicks off addMemberToGroup() without awaiting it;
      // drain the queue so the mutation, toast, and emit all settle.
      await flushPromises()
      expect(mutate).toHaveBeenCalledWith(
        expect.objectContaining({
          variables: { groupId: 'g1', userId: 'u1', roleInGroup: 'usual' },
        }),
      )
      expect($toast.success).toHaveBeenCalled()
      expect(wrapper.emitted('loadGroupMembers')).toBeTruthy()
      expect(wrapper.vm.isOpen).toBe(false)
    })

    it('surfaces mutation errors via toast', async () => {
      const mutate = jest.fn().mockRejectedValue(new Error('boom'))
      const { wrapper, $toast } = factory({}, mutate)
      wrapper.vm.user = { id: 'u1', name: 'Alice' }
      wrapper.vm.isOpen = true
      await wrapper.vm.$nextTick()
      await wrapper.vm.addMemberToGroup()
      expect($toast.error).toHaveBeenCalledWith('boom')
    })
  })
})
