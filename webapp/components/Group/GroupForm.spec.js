import { mount } from '@vue/test-utils'
import GroupForm from './GroupForm.vue'
import LocationPickerMap from '~/components/Map/LocationPickerMap'
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

  describe('location picker map', () => {
    beforeEach(() => {
      wrapper = mount(GroupForm, { propsData, mocks, localVue, stubs, store })
    })

    it('renders it with the coarser, group-appropriate precision/types/marker color', () => {
      const map = wrapper.findComponent(LocationPickerMap)
      expect(map.exists()).toBe(true)
      expect(map.props('precision')).toBe('resolved')
      expect(map.props('types')).toBe('place,region,country')
      expect(map.props('markerColorToken')).toBe('--color-map-marker-group')
    })

    it('passes the current locationName through as the map location', async () => {
      const location = { label: 'Berlin', value: 'Berlin', lat: 52.5, lng: 13.4 }
      wrapper.vm.$set(wrapper.vm.formData, 'locationName', location)
      await wrapper.vm.$nextTick()
      expect(wrapper.findComponent(LocationPickerMap).props('location')).toEqual(location)
    })

    it('adopts a location the map emits (drag/click pin placement)', () => {
      const picked = { label: 'Hamburg', value: 'Hamburg', id: 'place.hamburg', lat: 53.5, lng: 10 }
      wrapper.findComponent(LocationPickerMap).vm.$emit('input', picked)
      expect(wrapper.vm.formData.locationName).toEqual(picked)
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

    it('visually flags every invalid field (not just name) once an empty form is submitted', async () => {
      wrapper = mountFresh()
      wrapper.find('form').trigger('submit')
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()
      expect(wrapper.vm.visibleErrors).toEqual({
        name: expect.any(String),
        groupType: expect.any(String),
        description: expect.any(String),
        actionRadius: expect.any(String),
      })
      const errorWraps = wrapper.findAll('.ds-input-has-error')
      // OcelotInput (name) applies this class to its own root itself; the
      // other three (groupType <select>, description <editor>,
      // actionRadius <action-radius-select>) get it from the wrapping div
      // added around each, since none of those components track/apply it
      // on their own the way OcelotInput does.
      expect(errorWraps).toHaveLength(4)
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

    describe('lat/lng on submit', () => {
      const setValidFields = (vm) => {
        vm.$set(vm.formData, 'name', 'A valid name')
        vm.$set(vm.formData, 'groupType', 'public')
        vm.$set(vm.formData, 'description', 'A long enough description text.')
        vm.$set(vm.formData, 'actionRadius', 'regional')
      }

      it('includes the coordinates once locationName has been resolved (map pin or search result)', async () => {
        wrapper = mountFresh()
        setValidFields(wrapper.vm)
        wrapper.vm.$set(wrapper.vm.formData, 'locationName', {
          label: 'Berlin',
          value: 'Berlin',
          id: 'place.berlin',
          lat: 52.5,
          lng: 13.4,
        })
        wrapper.find('form').trigger('submit')
        await wrapper.vm.$nextTick()
        expect(wrapper.emitted('createGroup')[0][0]).toMatchObject({ lat: 52.5, lng: 13.4 })
      })

      it('sends null coordinates while locationName is still a plain, unresolved string', async () => {
        wrapper = mountFresh()
        setValidFields(wrapper.vm)
        wrapper.vm.$set(wrapper.vm.formData, 'locationName', 'Berlin')
        wrapper.find('form').trigger('submit')
        await wrapper.vm.$nextTick()
        expect(wrapper.emitted('createGroup')[0][0]).toMatchObject({ lat: null, lng: null })
      })
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
      it('reports an empty description', async () => {
        wrapper = mountFresh()
        wrapper.vm.updateEditorDescription('')
        await wrapper.vm.$nextTick()
        wrapper.vm.touchField('description')
        await wrapper.vm.$nextTick()
        expect(wrapper.vm.visibleErrors.description).toBe('group.validations.descriptionNotEmpty')
      })

      it('reports a description that is too short, distinctly from an empty one', async () => {
        wrapper = mountFresh()
        wrapper.vm.updateEditorDescription('Hi')
        await wrapper.vm.$nextTick()
        wrapper.vm.touchField('description')
        await wrapper.vm.$nextTick()
        expect(wrapper.vm.visibleErrors.description).toBe('group.validations.descriptionLength')
      })
    })

    describe('slug validation', () => {
      const mountEdit = () => mountFresh({ update: true, group })

      it('is not rendered at all when creating a new group', () => {
        wrapper = mountFresh()
        expect(wrapper.find('input[name="slug"]').exists()).toBe(false)
      })

      it('reports an empty slug', async () => {
        wrapper = mountEdit()
        const slugInput = wrapper.find('input[name="slug"]')
        slugInput.setValue('')
        await wrapper.vm.$nextTick()
        slugInput.trigger('blur')
        await wrapper.vm.$nextTick()
        expect(wrapper.vm.visibleErrors.slug).toBe('group.validations.slugNotEmpty')
      })

      it('rejects characters outside the backend slug pattern', async () => {
        wrapper = mountEdit()
        const slugInput = wrapper.find('input[name="slug"]')
        slugInput.setValue('My Slug!')
        await wrapper.vm.$nextTick()
        slugInput.trigger('blur')
        await wrapper.vm.$nextTick()
        expect(wrapper.vm.visibleErrors.slug).toBe('group.validations.slugInvalidCharacters')
      })

      it('accepts a valid slug', async () => {
        wrapper = mountEdit()
        const slugInput = wrapper.find('input[name="slug"]')
        slugInput.setValue('valid-slug_123')
        await wrapper.vm.$nextTick()
        slugInput.trigger('blur')
        await wrapper.vm.$nextTick()
        expect(wrapper.vm.visibleErrors?.slug).toBeUndefined()
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

    it('does not block onSubmit for someone who can create every type but has not picked one yet', () => {
      const wrapper = mountWith(() => true)
      const formSubmit = jest.spyOn(wrapper.vm, 'formSubmit').mockImplementation(() => {})
      expect(wrapper.vm.formData.groupType).toBe('')
      wrapper.vm.onSubmit()
      // Falls through to formSubmit()/validation instead of silently
      // returning — the schema's own "groupType is required" is what
      // should catch and report the still-missing type, not this guard.
      expect(formSubmit).toHaveBeenCalled()
    })

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

    describe('canCreateSelectedGroup before any type is chosen (formData.groupType === "")', () => {
      it('is true for someone who can create at least one type, e.g. an admin with every permission', () => {
        const wrapper = mountWith(() => true)
        expect(wrapper.vm.formData.groupType).toBe('')
        expect(wrapper.vm.canCreateSelectedGroup).toBe(true)
      })

      it('is false only for someone who cannot create any type at all', () => {
        const wrapper = mountWith(() => false)
        expect(wrapper.vm.formData.groupType).toBe('')
        expect(wrapper.vm.canCreateSelectedGroup).toBe(false)
      })

      it('does not mark the submit button as permission-denied for an admin who has not picked a type yet', () => {
        const wrapper = mountWith(() => true)
        const submitButton = wrapper.find('button[type="submit"]')
        expect(submitButton.classes()).not.toContain('permission-denied')
        // Vue omits the attribute entirely rather than rendering
        // aria-disabled="false".
        expect(submitButton.attributes('aria-disabled')).toBeUndefined()
      })
    })

    it('canCreateSelectedGroup checks the chosen type specifically once one is picked', () => {
      const wrapper = mountWith((p) => p === 'group.create_closed')
      wrapper.vm.formData.groupType = 'closed'
      expect(wrapper.vm.canCreateSelectedGroup).toBe(true)
      wrapper.vm.formData.groupType = 'public'
      expect(wrapper.vm.canCreateSelectedGroup).toBe(false)
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
