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
      $t: jest.fn((key) => key),
      $toast: { error: jest.fn() },
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

    it('shows the name length as "count / min–max"', () => {
      expect(wrapper.find('.os-validation-hint').text()).toContain('0 / 3–50')
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

  describe('validation hints', () => {
    const mountFresh = (propsDataOverride = { update: false, group: {} }) =>
      mount(GroupForm, {
        propsData: propsDataOverride,
        mocks: { ...mocks, $can: () => true },
        localVue,
        stubs,
        store,
      })

    it('never disables the submit button, regardless of validity', () => {
      wrapper = mountFresh()
      const submitButton = wrapper.find('button[type="submit"]')
      expect(submitButton.attributes('disabled')).toBeUndefined()
    })

    it('does not show a field error before it has been touched', () => {
      wrapper = mountFresh()
      expect(wrapper.vm.visibleErrors).toBeNull()
    })

    it('reveals only the touched field once it loses focus, not the whole form', async () => {
      wrapper = mountFresh()
      const nameInput = wrapper.find('input[name="name"]')
      nameInput.setValue('')
      await wrapper.vm.$nextTick()
      nameInput.trigger('blur')
      await wrapper.vm.$nextTick()
      expect(wrapper.vm.visibleErrors.name).toBeTruthy()
      expect(wrapper.vm.visibleErrors.description).toBeUndefined()
    })

    it("does not also show OcelotInput's own raw error text next to the validation hint", async () => {
      wrapper = mountFresh()
      const nameInput = wrapper.find('input[name="name"]')
      nameInput.setValue('')
      await wrapper.vm.$nextTick()
      nameInput.trigger('blur')
      await wrapper.vm.$nextTick()
      // hide-error suppresses OcelotInput's own built-in ".ds-input-error"
      // message (the raw, untranslated async-validator text, e.g. "name is
      // required") — the os-validation-hint next to it is the only message
      // meant to show.
      expect(wrapper.find('.ds-input-error').isVisible()).toBe(false)
    })

    it('reveals every error and shows a toast when submitting an invalid form, without saving', async () => {
      wrapper = mountFresh()
      wrapper.find('form').trigger('submit')
      await wrapper.vm.$nextTick()
      expect(mocks.$toast.error).toHaveBeenCalledWith('common.validations.formHasErrors')
      expect(wrapper.vm.visibleErrors.name).toBeTruthy()
      expect(wrapper.emitted('createGroup')).toBeFalsy()
    })

    it('saves once the form becomes valid', async () => {
      wrapper = mountFresh()
      await wrapper.vm.$set(wrapper.vm.formData, 'name', 'A valid name')
      await wrapper.vm.$set(wrapper.vm.formData, 'groupType', 'public')
      await wrapper.vm.$set(wrapper.vm.formData, 'description', 'A long enough description text.')
      await wrapper.vm.$set(wrapper.vm.formData, 'actionRadius', 'regional')
      wrapper.find('form').trigger('submit')
      await wrapper.vm.$nextTick()
      expect(wrapper.emitted('createGroup')).toBeTruthy()
    })

    describe('nameErrorText', () => {
      beforeEach(() => {
        wrapper = mountFresh()
      })

      it('is null while untouched', () => {
        expect(wrapper.vm.nameErrorText).toBeNull()
      })

      it('reports an empty name', async () => {
        const nameInput = wrapper.find('input[name="name"]')
        nameInput.setValue('')
        await wrapper.vm.$nextTick()
        wrapper.vm.touchField('name')
        expect(wrapper.vm.nameErrorText).toBe('group.validations.nameNotEmpty')
      })

      it('reports a name that is too short', async () => {
        const nameInput = wrapper.find('input[name="name"]')
        nameInput.setValue('x')
        await wrapper.vm.$nextTick()
        wrapper.vm.touchField('name')
        expect(wrapper.vm.nameErrorText).toBe('group.validations.nameLength')
      })
    })

    describe('description validation', () => {
      it('surfaces a real (non-empty) error message once touched', async () => {
        wrapper = mountFresh()
        wrapper.vm.updateEditorDescription('')
        await wrapper.vm.$nextTick()
        wrapper.vm.touchField('description')
        await wrapper.vm.$nextTick()
        expect(wrapper.vm.visibleErrors.description).toBe('group.validations.descriptionNotEmpty')
      })
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

  describe('effectiveShowMembers', () => {
    const mountWithType = (groupType, showMembers = false) =>
      mount(GroupForm, {
        propsData: { update: false, group: { groupType, showMembers } },
        mocks: { $t: jest.fn(), $can: () => true },
        localVue,
        stubs,
        store,
      })

    it('returns true for public groups regardless of showMembers', () => {
      expect(mountWithType('public', false).vm.effectiveShowMembers).toBe(true)
      expect(mountWithType('public', true).vm.effectiveShowMembers).toBe(true)
    })

    it('returns false for hidden groups regardless of showMembers', () => {
      expect(mountWithType('hidden', true).vm.effectiveShowMembers).toBe(false)
      expect(mountWithType('hidden', false).vm.effectiveShowMembers).toBe(false)
    })

    it('returns the actual showMembers value for closed groups', () => {
      expect(mountWithType('closed', false).vm.effectiveShowMembers).toBe(false)
      expect(mountWithType('closed', true).vm.effectiveShowMembers).toBe(true)
    })

    it('disables the checkbox when groupType is not closed', async () => {
      const wrapper = mountWithType('public')
      expect(wrapper.find('#show-members').attributes('disabled')).toBeDefined()
      await wrapper.vm.$set(wrapper.vm.formData, 'groupType', 'closed')
      expect(wrapper.find('#show-members').attributes('disabled')).toBeUndefined()
      await wrapper.vm.$set(wrapper.vm.formData, 'groupType', 'hidden')
      expect(wrapper.find('#show-members').attributes('disabled')).toBeDefined()
    })
  })
})
