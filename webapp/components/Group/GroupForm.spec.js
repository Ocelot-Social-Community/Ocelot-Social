import { mount } from '@vue/test-utils'
import GroupForm from './GroupForm.vue'
import Vuex from 'vuex'

const localVue = global.localVue

const stubs = {
  'nuxt-link': true,
}

const propsData = {
  update: false,
  group: {},
}

describe('GroupForm', () => {
  let wrapper
  let mocks
  let storeMocks
  let store

  beforeEach(() => {
    mocks = {
      $t: jest.fn(),
    }
    storeMocks = {
      getters: {},
      actions: {
        'categories/init': jest.fn(),
      },
    }
    store = new Vuex.Store(storeMocks)
  })

  describe('mount', () => {
    const Wrapper = () => {
      return mount(GroupForm, { propsData, mocks, localVue, stubs, store })
    }

    beforeEach(() => {
      wrapper = Wrapper()
    })

    it('renders', () => {
      expect(wrapper.findAll('.group-form')).toHaveLength(1)
    })
  })

  const group = {
    id: '1',
    name: 'Test Group',
    slug: 'test-group',
    groupType: 'public',
    about: 'About',
    description: 'Description text',
    actionRadius: 'local',
    locationName: '',
    categories: [
      { id: 'cat-1', slug: 'family' },
      { id: 'cat-2', slug: 'work' },
      { id: 'cat-3', slug: 'psyche' },
    ],
  }

  describe('sameCategories', () => {
    beforeEach(() => {
      wrapper = mount(GroupForm, {
        propsData: { update: true, group },
        mocks,
        localVue,
        stubs,
        store,
      })
    })

    it('returns true when categories unchanged', () => {
      expect(wrapper.vm.sameCategories).toBe(true)
    })

    it('returns false when a category is deselected', async () => {
      await wrapper.vm.$set(wrapper.vm.formData, 'categoryIds', ['cat-1', 'cat-2'])
      expect(wrapper.vm.sameCategories).toBe(false)
    })

    it('returns false when a category is swapped (same count)', async () => {
      await wrapper.vm.$set(wrapper.vm.formData, 'categoryIds', ['cat-1', 'cat-2', 'cat-4'])
      expect(wrapper.vm.sameCategories).toBe(false)
    })

    it('returns true when same categories re-selected after deselect', async () => {
      await wrapper.vm.$set(wrapper.vm.formData, 'categoryIds', ['cat-1', 'cat-2'])
      await wrapper.vm.$set(wrapper.vm.formData, 'categoryIds', ['cat-1', 'cat-2', 'cat-3'])
      expect(wrapper.vm.sameCategories).toBe(true)
    })
  })

  describe('disableButtonByUpdate', () => {
    beforeEach(() => {
      wrapper = mount(GroupForm, {
        propsData: { update: true, group },
        mocks,
        localVue,
        stubs,
        store,
      })
    })

    it('is true initially when nothing changed', () => {
      expect(wrapper.vm.disableButtonByUpdate).toBe(true)
    })

    it('is false when name is changed', async () => {
      await wrapper.vm.$set(wrapper.vm.formData, 'name', 'New Name')
      expect(wrapper.vm.disableButtonByUpdate).toBe(false)
    })

    it('is false when a category is swapped', async () => {
      await wrapper.vm.$set(wrapper.vm.formData, 'categoryIds', ['cat-1', 'cat-2', 'cat-4'])
      expect(wrapper.vm.disableButtonByUpdate).toBe(false)
    })

    it('is true again after successful save', async () => {
      await wrapper.vm.$set(wrapper.vm.formData, 'name', 'New Name')
      await wrapper.vm.$set(wrapper.vm.formData, 'categoryIds', ['cat-1', 'cat-2', 'cat-4'])
      expect(wrapper.vm.disableButtonByUpdate).toBe(false)

      wrapper.vm.submit()
      const [, done] = wrapper.emitted('updateGroup')[0]
      done(true)
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.disableButtonByUpdate).toBe(true)
    })

    it('keeps loading false and disableButtonByUpdate false after failed save', async () => {
      await wrapper.vm.$set(wrapper.vm.formData, 'name', 'New Name')
      await wrapper.vm.$set(wrapper.vm.formData, 'categoryIds', ['cat-1', 'cat-2', 'cat-4'])
      expect(wrapper.vm.disableButtonByUpdate).toBe(false)

      wrapper.vm.submit()
      const [, done] = wrapper.emitted('updateGroup')[0]
      done(false)
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.loading).toBe(false)
      expect(wrapper.vm.disableButtonByUpdate).toBe(false)
    })

    it('is false again after save and further changes', async () => {
      wrapper.vm.submit()
      const [, done] = wrapper.emitted('updateGroup')[0]
      done(true)
      await wrapper.vm.$nextTick()

      await wrapper.vm.$set(wrapper.vm.formData, 'name', 'Changed Again')
      expect(wrapper.vm.disableButtonByUpdate).toBe(false)
    })
  })

  describe('per-type create permissions (group.create_*)', () => {
    const mountWith = (can) =>
      mount(GroupForm, {
        propsData: { update: false, group: {} },
        mocks: { $t: jest.fn(), $can: can },
        localVue,
        stubs,
        store,
      })

    // Flat model: each group type is gated by its own permission. A user who can
    // create public/closed groups but not hidden ones.
    const canExceptHidden = (p) => p !== 'group.create_hidden'

    it('blocks onSubmit for a hidden group without group.create_hidden', () => {
      const wrapper = mountWith(canExceptHidden)
      const formSubmit = jest.spyOn(wrapper.vm, 'formSubmit').mockImplementation(() => {})
      wrapper.vm.formData.groupType = 'hidden'
      wrapper.vm.onSubmit()
      expect(formSubmit).not.toHaveBeenCalled()
    })

    it('blocks onSubmit for a public group without group.create_public', () => {
      const wrapper = mountWith((p) => p !== 'group.create_public')
      const formSubmit = jest.spyOn(wrapper.vm, 'formSubmit').mockImplementation(() => {})
      wrapper.vm.formData.groupType = 'public'
      wrapper.vm.onSubmit()
      expect(formSubmit).not.toHaveBeenCalled()
    })

    it('allows onSubmit for a hidden group with group.create_hidden', () => {
      const wrapper = mountWith(() => true)
      const formSubmit = jest.spyOn(wrapper.vm, 'formSubmit').mockImplementation(() => {})
      wrapper.vm.formData.groupType = 'hidden'
      wrapper.vm.onSubmit()
      expect(formSubmit).toHaveBeenCalled()
    })

    it('disables the hidden option in the type select when not permitted', () => {
      const wrapper = mountWith(canExceptHidden)
      const hiddenOption = wrapper
        .findAll('option')
        .wrappers.find((o) => o.attributes('value') === 'hidden')
      expect(hiddenOption.attributes('disabled')).toBeDefined()
    })

    it('disables the closed option in the type select when not permitted', () => {
      const wrapper = mountWith((p) => p !== 'group.create_closed')
      const closedOption = wrapper
        .findAll('option')
        .wrappers.find((o) => o.attributes('value') === 'closed')
      expect(closedOption.attributes('disabled')).toBeDefined()
    })

    it('canCreateAnyGroup is false only when no type is permitted', () => {
      expect(mountWith(() => false).vm.canCreateAnyGroup).toBe(false)
      expect(mountWith((p) => p === 'group.create_closed').vm.canCreateAnyGroup).toBe(true)
    })

    const mountEdit = (can, groupOverrides = {}) =>
      mount(GroupForm, {
        propsData: { update: true, group: { ...group, ...groupOverrides } },
        mocks: { $t: jest.fn(), $can: can },
        localVue,
        stubs,
        store,
      })

    it('blocks switching an existing public group to hidden without group.create_hidden', () => {
      const wrapper = mountEdit(() => false, { groupType: 'public' })
      const formSubmit = jest.spyOn(wrapper.vm, 'formSubmit').mockImplementation(() => {})
      wrapper.vm.formData.groupType = 'hidden'
      wrapper.vm.onSubmit()
      expect(formSubmit).not.toHaveBeenCalled()
    })

    it('allows editing an already-hidden group without group.create_hidden', () => {
      const wrapper = mountEdit(() => false, { groupType: 'hidden' })
      const formSubmit = jest.spyOn(wrapper.vm, 'formSubmit').mockImplementation(() => {})
      wrapper.vm.formData.groupType = 'hidden'
      wrapper.vm.onSubmit()
      expect(formSubmit).toHaveBeenCalled()
    })

    it('keeps the hidden option enabled when the group is already hidden', () => {
      const wrapper = mountEdit(() => false, { groupType: 'hidden' })
      const hiddenOption = wrapper
        .findAll('option')
        .wrappers.find((o) => o.attributes('value') === 'hidden')
      expect(hiddenOption.attributes('disabled')).toBeUndefined()
    })
  })
})
