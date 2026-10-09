import { mount } from '@vue/test-utils'
import GroupForm from './GroupForm.vue'
import LocationPickerMap from '~/components/Map/LocationPickerMap'
import LocationSelect from '~/components/Select/LocationSelect'
import Vuex from 'vuex'
import { branding } from '@ocelot-social/branding'

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

  describe('category validation hint', () => {
    // The category count hint used to hard-code "3" as its max (and had no
    // min at all), even though formSchema.categoryIds' own validator already
    // used branding.category.min/max — a silent mismatch if that branding
    // config ever changed. categoriesActive requires both the $policy flag
    // and at least one real category (see getCategoriesMixin.js), neither of
    // which the shared mocks/store above provide.
    it('reflects branding.category.min/max instead of a hard-coded value', () => {
      const wrapper = mount(GroupForm, {
        propsData,
        mocks: { ...mocks, $policy: { get: () => true } },
        localVue,
        stubs,
        store: new Vuex.Store({
          getters: {
            'categories/categories': () => [{ id: 'cat-1', slug: 'family' }],
            'categories/isInitialized': () => true,
          },
          actions: { 'categories/init': jest.fn() },
        }),
      })
      const hints = wrapper.findAll('.os-validation-hint')
      const categoryHint = hints.at(hints.length - 1)
      expect(categoryHint.text()).toContain(`0 / ${branding.category.min}–${branding.category.max}`)
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
      expect(map.props('types')).toBe('neighborhood,locality,place,region,country')
      expect(map.props('markerColorToken')).toBe('--color-map-marker-group')
    })

    // Same types the map itself resolves to (see above) — otherwise typing a
    // district's name into the search box couldn't find it even though
    // dragging the pin there works fine.
    it('gives the text search the same district-level types as the map', () => {
      expect(wrapper.findComponent(LocationSelect).props('types')).toBe(
        'neighborhood,locality,place,region,country',
      )
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
    visibility: 'public',
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

  describe('previousLocationName', () => {
    const mountWith = (propsDataOverride) =>
      mount(GroupForm, { propsData: propsDataOverride, mocks, localVue, stubs, store })

    // The genuine interaction points — LocationSelect emitting 'input' (a
    // pick from the dropdown, or the user's own typed text resolving) and
    // LocationPickerMap emitting 'input' (a map click/drag) — as opposed to
    // directly poking formData.locationName, which bypasses the
    // locationChangedByUser tracking these tests are about.
    const pickViaSelect = (value) => wrapper.findComponent(LocationSelect).vm.$emit('input', value)
    const pickViaMap = (value) => wrapper.findComponent(LocationPickerMap).vm.$emit('input', value)

    it('is null when creating a new group (nothing was ever saved yet)', () => {
      wrapper = mountWith({ update: false, group: {} })
      pickViaSelect('Berlin')
      expect(wrapper.vm.previousLocationName).toBeNull()
    })

    it('is null right after mount, before the location has been touched at all', () => {
      wrapper = mountWith({ update: true, group: { ...group, locationName: 'Hamburg' } })
      expect(wrapper.vm.formData.locationName).toBe('Hamburg')
      expect(wrapper.vm.previousLocationName).toBeNull()
    })

    // The actual bug this covers: LocationSelect resolves the group's
    // already-saved plain locationName into a normalized object right on
    // mount (e.g. "Hamburg" -> { value: "Hamburg, Germany", ... }) purely to
    // display it properly — not because anything was picked. That first
    // 'input' must not count as a change, or the hint would show up
    // immediately for every group that already has a location, regardless
    // of whether the user touched it.
    it("stays null through LocationSelect's own mount-time auto-resolve of the saved value", () => {
      wrapper = mountWith({ update: true, group: { ...group, locationName: 'Hamburg' } })
      pickViaSelect({ label: 'Hamburg, Germany', value: 'Hamburg, Germany', id: 'place.hh' })
      expect(wrapper.vm.previousLocationName).toBeNull()
    })

    it('is null while editing if the group never had a saved location', () => {
      wrapper = mountWith({ update: true, group: { ...group, locationName: '' } })
      pickViaSelect('Berlin')
      expect(wrapper.vm.previousLocationName).toBeNull()
    })

    it('reports the saved location once a genuine pick via the search diverges from it', () => {
      wrapper = mountWith({ update: true, group: { ...group, locationName: 'Hamburg' } })
      // The suppressed auto-resolve (see test above) happens first...
      pickViaSelect({ label: 'Hamburg, Germany', value: 'Hamburg, Germany', id: 'place.hh' })
      // ...then the user picks somewhere else.
      pickViaSelect('Berlin')
      expect(wrapper.vm.previousLocationName).toBe('Hamburg')
    })

    it('reports the saved location once the map pin is moved', () => {
      wrapper = mountWith({ update: true, group: { ...group, locationName: 'Hamburg' } })
      pickViaMap({ label: 'Berlin', value: 'Berlin', id: 'place.berlin', lat: 52.5, lng: 13.4 })
      expect(wrapper.vm.previousLocationName).toBe('Hamburg')
    })

    it('shows the hint text once it applies, and hides it again once it does not', async () => {
      wrapper = mountWith({ update: true, group: { ...group, locationName: 'Hamburg' } })
      expect(wrapper.find('.previous-location-hint').exists()).toBe(false)

      // The suppressed auto-resolve, same as LocationSelect's own would fire
      // right after mount (see the dedicated test above) — a real drag/pick
      // this fast essentially never happens, but keeping the sequence
      // realistic here too rather than relying on that.
      pickViaSelect({ label: 'Hamburg, Germany', value: 'Hamburg, Germany', id: 'place.hh' })
      pickViaSelect('Berlin')
      await wrapper.vm.$nextTick()
      expect(wrapper.find('.previous-location-hint').text()).toBe('common.previousLocation')

      pickViaSelect('Hamburg')
      await wrapper.vm.$nextTick()
      expect(wrapper.find('.previous-location-hint').exists()).toBe(false)
    })

    it('clears once the change is actually saved, instead of comparing against the stale opened-with value', async () => {
      wrapper = mountWith({ update: true, group: { ...group, locationName: 'Hamburg' } })
      pickViaSelect({ label: 'Hamburg, Germany', value: 'Hamburg, Germany', id: 'place.hh' })
      pickViaSelect('Berlin')
      expect(wrapper.vm.previousLocationName).toBe('Hamburg')

      wrapper.vm.submit()
      // The edit page stays open after a save (no navigation/remount), so
      // the group prop itself never refreshes — only the done(true) callback
      // tells the form the save actually went through.
      const done = wrapper.emitted('updateGroup')[0][1]
      done(true)
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.previousLocationName).toBeNull()
      expect(wrapper.find('.previous-location-hint').exists()).toBe(false)
    })

    it('does not clear when the save fails', () => {
      wrapper = mountWith({ update: true, group: { ...group, locationName: 'Hamburg' } })
      pickViaSelect({ label: 'Hamburg, Germany', value: 'Hamburg, Germany', id: 'place.hh' })
      pickViaSelect('Berlin')

      wrapper.vm.submit()
      const done = wrapper.emitted('updateGroup')[0][1]
      done()

      expect(wrapper.vm.previousLocationName).toBe('Hamburg')
    })
  })

  describe('hasUnsavedChanges', () => {
    const mountWith = (propsDataOverride) =>
      mount(GroupForm, { propsData: propsDataOverride, mocks, localVue, stubs, store })

    it('is false right after mount', () => {
      const wrapper = mountWith({ update: true, group })
      expect(wrapper.vm.hasUnsavedChanges).toBe(false)
    })

    it('becomes true once a field goes through updateFormField (e.g. the name)', () => {
      const wrapper = mountWith({ update: true, group })
      wrapper.vm.updateFormField('name', 'A new name')
      expect(wrapper.vm.hasUnsavedChanges).toBe(true)
    })

    it('becomes true once the location is genuinely changed (map)', () => {
      const wrapper = mountWith({ update: true, group })
      wrapper
        .findComponent(LocationPickerMap)
        .vm.$emit('input', { label: 'Berlin', value: 'Berlin', lat: 52.5, lng: 13.4 })
      expect(wrapper.vm.hasUnsavedChanges).toBe(true)
    })

    it("stays false through LocationSelect's own mount-time auto-resolve of an already-saved location", () => {
      const wrapper = mountWith({ update: true, group: { ...group, locationName: 'Hamburg' } })
      wrapper
        .findComponent(LocationSelect)
        .vm.$emit('input', { label: 'Hamburg, Germany', value: 'Hamburg, Germany', id: 'x' })
      expect(wrapper.vm.hasUnsavedChanges).toBe(false)
    })

    it('resets to false once the change is actually saved', () => {
      const wrapper = mount(GroupForm, {
        propsData: { update: true, group },
        mocks: { ...mocks, $can: () => true },
        localVue,
        stubs,
        store,
      })
      wrapper.vm.updateFormField('name', 'A new name')
      expect(wrapper.vm.hasUnsavedChanges).toBe(true)

      wrapper.vm.submit()
      const done = wrapper.emitted('updateGroup')[0][1]
      done(true)

      expect(wrapper.vm.hasUnsavedChanges).toBe(false)
    })

    it('does not reset when the save fails', () => {
      const wrapper = mount(GroupForm, {
        propsData: { update: true, group },
        mocks: { ...mocks, $can: () => true },
        localVue,
        stubs,
        store,
      })
      wrapper.vm.updateFormField('name', 'A new name')

      wrapper.vm.submit()
      const done = wrapper.emitted('updateGroup')[0][1]
      done()

      expect(wrapper.vm.hasUnsavedChanges).toBe(true)
    })

    // submit() to done() is a real network round-trip, not instantaneous —
    // an edit made while the mutation is still in flight was not part of
    // what got sent, so it must survive done(true) rather than being wiped
    // out along with the fields that actually were submitted.
    it('keeps a field dirty if it is changed again while the save is still in flight', () => {
      const wrapper = mount(GroupForm, {
        propsData: { update: true, group },
        mocks: { ...mocks, $can: () => true },
        localVue,
        stubs,
        store,
      })
      wrapper.vm.updateFormField('name', 'A new name')

      wrapper.vm.submit()
      const done = wrapper.emitted('updateGroup')[0][1]
      // Simulate a further edit arriving before the mutation resolves.
      wrapper.vm.updateFormField('about', 'A new about text')
      done(true)

      expect(wrapper.vm.dirtyFields.name).toBeUndefined()
      expect(wrapper.vm.dirtyFields.about).toBe(true)
      expect(wrapper.vm.hasUnsavedChanges).toBe(true)
    })

    // Same race, but the SAME field gets edited again (not a different one)
    // before done() runs — a bare key snapshot would still delete it, since
    // "name" was already in dirtyFields at submit time; only comparing the
    // actual value catches that the newer edit was never sent.
    it('keeps a field dirty if it is changed again to a different value before done(true) runs', () => {
      const wrapper = mount(GroupForm, {
        propsData: { update: true, group },
        mocks: { ...mocks, $can: () => true },
        localVue,
        stubs,
        store,
      })
      wrapper.vm.updateFormField('name', 'A new name')

      wrapper.vm.submit()
      const done = wrapper.emitted('updateGroup')[0][1]
      // Simulate the same field being edited again before the mutation resolves.
      wrapper.vm.updateFormField('name', 'Yet another name')
      done(true)

      expect(wrapper.vm.dirtyFields.name).toBe(true)
      expect(wrapper.vm.hasUnsavedChanges).toBe(true)
    })

    // Same race, but for the location field, which is tracked separately
    // via locationChangedByUser/savedLocationName rather than dirtyFields.
    it('keeps the location marked unsaved if it is changed again while the save is still in flight', () => {
      const wrapper = mount(GroupForm, {
        propsData: { update: true, group },
        mocks: { ...mocks, $can: () => true },
        localVue,
        stubs,
        store,
      })
      wrapper
        .findComponent(LocationPickerMap)
        .vm.$emit('input', { label: 'Berlin', value: 'Berlin', lat: 52.5, lng: 13.4 })

      wrapper.vm.submit()
      const done = wrapper.emitted('updateGroup')[0][1]
      // Simulate a further location change arriving before the mutation resolves.
      wrapper
        .findComponent(LocationPickerMap)
        .vm.$emit('input', { label: 'Hamburg', value: 'Hamburg', lat: 53.5, lng: 10 })
      done(true)

      expect(wrapper.vm.locationChangedByUser).toBe(true)
      expect(wrapper.vm.hasUnsavedChanges).toBe(true)
    })
  })

  describe('submit button greyed-out-but-clickable states', () => {
    const mountWith = (propsDataOverride, can = () => true) =>
      mount(GroupForm, {
        propsData: propsDataOverride,
        mocks: { ...mocks, $can: can },
        localVue,
        stubs,
        store,
      })

    // Not an actual :disabled — see submitVisuallyDenied's own doc comment:
    // hasUnsavedChanges only tracks whether something was touched, not
    // whether it truly differs from what's saved, so a tracking gap must
    // never make a real save unreachable. Visually greyed via the class, but
    // deliberately NOT aria-disabled — the button genuinely still works, and
    // telling assistive tech otherwise would be actively wrong here, not
    // just cosmetically off (see the template's own aria-disabled binding,
    // which only reflects the real permission gate).
    it('greys out the submit button while editing with nothing changed yet, without marking it aria-disabled', () => {
      const wrapper = mountWith({ update: true, group })
      const submitButton = wrapper.find('button[type="submit"]')

      expect(submitButton.classes()).toContain('permission-denied')
      expect(submitButton.attributes('aria-disabled')).toBeUndefined()
      expect(submitButton.attributes('disabled')).toBeUndefined()
    })

    it('un-greys the submit button once something has actually been changed', async () => {
      const wrapper = mountWith({ update: true, group })
      wrapper.vm.updateFormField('name', 'A new name')
      await wrapper.vm.$nextTick()

      const submitButton = wrapper.find('button[type="submit"]')
      expect(submitButton.classes()).not.toContain('permission-denied')
      expect(submitButton.attributes('aria-disabled')).toBeUndefined()
    })

    it('leaves the create form exactly as it was — never greyed out for "no changes"', () => {
      const wrapper = mountWith({ update: false, group: {} })
      const submitButton = wrapper.find('button[type="submit"]')

      expect(submitButton.classes()).not.toContain('permission-denied')
      expect(submitButton.attributes('aria-disabled')).toBeUndefined()
    })

    it('still greys out for a genuinely missing permission, distinct from "no changes", and marks it aria-disabled', () => {
      const wrapper = mountWith({ update: false, group: {} }, () => false)
      wrapper.vm.$set(wrapper.vm.formData, 'visibility', 'public')

      const submitButton = wrapper.find('button[type="submit"]')
      expect(submitButton.classes()).toContain('permission-denied')
      expect(submitButton.attributes('aria-disabled')).toBe('true')
      expect(wrapper.vm.submitDeniedHint).toBe('permissions.deniedHint')
    })

    // While editing, canCreateSelectedGroup used to short-circuit to true
    // regardless of type — missing the same hidden-transition permission
    // onSubmit itself blocks on, so the button looked clickable but a click
    // silently did nothing. The button now has to grey out here too, not
    // just refuse the click.
    it('greys out while editing when switching an existing group to hidden without permission', async () => {
      const wrapper = mountWith(
        { update: true, group },
        (permission) => permission !== 'group.create_hidden',
      )
      wrapper.vm.updateFormField('visibility', 'hidden')
      await wrapper.vm.$nextTick()

      const submitButton = wrapper.find('button[type="submit"]')
      expect(submitButton.classes()).toContain('permission-denied')
      expect(wrapper.vm.submitDeniedHint).toBe('permissions.deniedHint')
    })
  })

  describe('onBeforeUnload (native browser tab-close/reload prompt)', () => {
    const mountWith = (propsDataOverride) =>
      mount(GroupForm, { propsData: propsDataOverride, mocks, localVue, stubs, store })

    it('registers the listener on mount and unregisters it via its own beforeDestroy hook', () => {
      const addSpy = jest.spyOn(window, 'addEventListener')
      const removeSpy = jest.spyOn(window, 'removeEventListener')
      const wrapper = mountWith({ update: true, group })

      expect(addSpy).toHaveBeenCalledWith('beforeunload', wrapper.vm.onBeforeUnload)

      // Not wrapper.destroy(): tiptap's own EditorContent#beforeDestroy
      // throws when torn down outside a full page unmount (see
      // ContributionForm.spec.js for the same, pre-existing issue) — call
      // the hook directly instead of triggering a real destroy cascade.
      wrapper.vm.$options.beforeDestroy[0].call(wrapper.vm)

      expect(removeSpy).toHaveBeenCalledWith('beforeunload', wrapper.vm.onBeforeUnload)
      addSpy.mockRestore()
      removeSpy.mockRestore()
    })

    it('does nothing when there are no unsaved changes', () => {
      const wrapper = mountWith({ update: true, group })
      const event = { preventDefault: jest.fn(), returnValue: undefined }

      wrapper.vm.onBeforeUnload(event)

      expect(event.preventDefault).not.toHaveBeenCalled()
    })

    it('prevents the default and sets returnValue when there are unsaved changes', () => {
      const wrapper = mountWith({ update: true, group })
      wrapper.vm.updateFormField('name', 'A new name')
      const event = { preventDefault: jest.fn(), returnValue: undefined }

      wrapper.vm.onBeforeUnload(event)

      expect(event.preventDefault).toHaveBeenCalled()
      expect(event.returnValue).toBe('')
    })
  })

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
        // The CREATE form asks for a template; the visibility it results in is derived from it
        // and is never a field of its own here.
        template: expect.any(String),
        description: expect.any(String),
        actionRadius: expect.any(String),
      })
      const errorWraps = wrapper.findAll('.ds-input-has-error')
      // OcelotInput (name) applies this class to its own root itself; the
      // other two (description <editor>, actionRadius <action-radius-select>)
      // get it from the wrapping div added around each, since neither tracks
      // it on its own the way OcelotInput does. The template picker is a row
      // of cards rather than an input, and says so with its own hint.
      expect(errorWraps).toHaveLength(3)
    })

    it('saves once the form becomes valid', async () => {
      wrapper = mountFresh()
      await wrapper.vm.$set(wrapper.vm.formData, 'name', 'A valid name')
      await wrapper.vm.$set(wrapper.vm.formData, 'template', 'public')
      await wrapper.vm.$set(wrapper.vm.formData, 'description', 'A long enough description text.')
      await wrapper.vm.$set(wrapper.vm.formData, 'actionRadius', 'regional')
      wrapper.find('form').trigger('submit')
      await wrapper.vm.$nextTick()
      expect(wrapper.emitted('createGroup')).toBeTruthy()
    })

    describe('lat/lng on submit', () => {
      const setValidFields = (vm) => {
        vm.$set(vm.formData, 'name', 'A valid name')
        vm.$set(vm.formData, 'template', 'public')
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
        // The id decides the place on the server; the name only labels it, in the language it
        // was shown in.
        expect(wrapper.emitted('createGroup')[0][0]).toMatchObject({
          locationId: 'place.berlin',
          lat: 52.5,
          lng: 13.4,
        })
      })

      it('sends no id for a map point nothing was found at', async () => {
        wrapper = mountFresh()
        setValidFields(wrapper.vm)
        wrapper.vm.$set(wrapper.vm.formData, 'locationName', {
          label: '52.5, 13.4',
          value: '52.5, 13.4',
          id: null,
          lat: 52.5,
          lng: 13.4,
        })
        wrapper.find('form').trigger('submit')
        await wrapper.vm.$nextTick()
        expect(wrapper.emitted('createGroup')[0][0]).toMatchObject({ locationId: null })
      })

      it('sends null coordinates while locationName is still a plain, unresolved string', async () => {
        wrapper = mountFresh()
        setValidFields(wrapper.vm)
        wrapper.vm.$set(wrapper.vm.formData, 'locationName', 'Berlin')
        wrapper.find('form').trigger('submit')
        await wrapper.vm.$nextTick()
        expect(wrapper.emitted('createGroup')[0][0]).toMatchObject({
          locationId: null,
          lat: null,
          lng: null,
        })
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
        expect(wrapper.vm.nameErrorText).toBe('common.validations.nameLength')
      })

      it('reports a name consisting only of whitespace as empty, even if long enough', async () => {
        const nameInput = wrapper.find('input[name="name"]')
        nameInput.setValue('    ')
        await wrapper.vm.$nextTick()
        wrapper.vm.touchField('name')
        expect(wrapper.vm.nameErrorText).toBe('group.validations.nameNotEmpty')
      })

      it('accepts a valid name padded with whitespace', async () => {
        const nameInput = wrapper.find('input[name="name"]')
        nameInput.setValue('  Solawi Freiburg  ')
        await wrapper.vm.$nextTick()
        wrapper.vm.touchField('name')
        expect(wrapper.vm.nameErrorText).toBeNull()
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
    const mountWith = (can, props = {}) =>
      mount(GroupForm, {
        propsData: { update: false, group: {}, ...props },
        mocks: { $t: jest.fn((key) => key), $can: can },
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
      expect(wrapper.vm.formData.visibility).toBe('')
      wrapper.vm.onSubmit()
      // Falls through to formSubmit()/validation instead of silently
      // returning — the schema's own "visibility is required" is what
      // should catch and report the still-missing type, not this guard.
      expect(formSubmit).toHaveBeenCalled()
    })

    it('blocks onSubmit for a hidden group without group.create_hidden', () => {
      const wrapper = mountWith(canExceptHidden)
      const formSubmit = jest.spyOn(wrapper.vm, 'formSubmit').mockImplementation(() => {})
      wrapper.vm.formData.visibility = 'hidden'
      wrapper.vm.onSubmit()
      expect(formSubmit).not.toHaveBeenCalled()
    })

    it('blocks onSubmit for a public group without group.create_public', () => {
      const wrapper = mountWith((p) => p !== 'group.create_public')
      const formSubmit = jest.spyOn(wrapper.vm, 'formSubmit').mockImplementation(() => {})
      wrapper.vm.formData.visibility = 'public'
      wrapper.vm.onSubmit()
      expect(formSubmit).not.toHaveBeenCalled()
    })

    it('allows onSubmit for a hidden group with group.create_hidden', () => {
      const wrapper = mountWith(() => true)
      const formSubmit = jest.spyOn(wrapper.vm, 'formSubmit').mockImplementation(() => {})
      wrapper.vm.formData.visibility = 'hidden'
      wrapper.vm.onSubmit()
      expect(formSubmit).toHaveBeenCalled()
    })

    const twoTemplates = {
      templates: [
        { name: 'channel', visibility: 'public' },
        { name: 'hidden', visibility: 'hidden' },
      ],
    }

    it('refuses, rather than hides, a template the viewer may not create, and stays reachable to say why', () => {
      // Shown and refused: "there is a kind of group I am not allowed to make" is information,
      // an absent card is not. aria-disabled rather than disabled: a disabled button leaves the
      // tab order, and with it the only way a keyboard reaches the reason.
      const wrapper = mountWith(canExceptHidden)
      const hidden = wrapper.find('[data-test="template-card-hidden"]')

      expect(hidden.attributes('aria-disabled')).toBe('true')
      expect(hidden.attributes('disabled')).toBeUndefined()
      expect(hidden.attributes('title')).toBe('group.validations.typeNotAllowed')
      expect(wrapper.find('[data-test="template-card-public"]').attributes('aria-disabled')).toBe(
        'false',
      )
    })

    it('picks nothing when a refused card is clicked', async () => {
      const wrapper = mountWith(canExceptHidden)

      await wrapper.find('[data-test="template-card-hidden"]').trigger('click')

      expect(wrapper.vm.formData.template).toBe('')
    })

    it('reads the cost off the visibility a template derives to, not off its name', () => {
      // A channel IS a public group, so making one takes group.create_public — the whole point
      // of carrying the visibility alongside the name.
      const wrapper = mountWith((p) => p !== 'group.create_public', {
        templates: [
          { name: 'channel', visibility: 'public' },
          { name: 'closed', visibility: 'closed' },
        ],
      })

      expect(wrapper.find('[data-test="template-card-channel"]').attributes('aria-disabled')).toBe(
        'true',
      )
      expect(wrapper.find('[data-test="template-card-closed"]').attributes('aria-disabled')).toBe(
        'false',
      )
    })

    it('picking a template sets the visibility it derives to', async () => {
      const wrapper = mountWith(() => true, {
        templates: [{ name: 'channel', visibility: 'public' }],
      })

      await wrapper.find('[data-test="template-card-channel"]').trigger('click')

      expect(wrapper.vm.formData.template).toBe('channel')
      expect(wrapper.vm.formData.visibility).toBe('public')
      expect(wrapper.find('[data-test="template-card-channel"]').classes()).toContain(
        'group-state-card--active',
      )
    })

    it('tells the keyboard why a refused template cannot be picked, when it focuses the card', async () => {
      const wrapper = mountWith(canExceptHidden)

      wrapper.find('[data-test="template-card-hidden"]').element.dispatchEvent(new Event('focus'))
      await wrapper.vm.$nextTick()

      expect(wrapper.find('[data-test="template-description-refused"]').text()).toBe(
        'group.validations.typeNotAllowed',
      )
    })

    it('says why a refused template cannot be picked, where its meaning is explained', async () => {
      // Keyboard and touch never see a tooltip — the reason is text, shown for the card pointed
      // at (here) or focused (above).
      const wrapper = mountWith(canExceptHidden)
      const hiddenItem = wrapper.find('[data-test="template-card-hidden"]').element.parentElement

      hiddenItem.dispatchEvent(new Event('mouseenter'))
      await wrapper.vm.$nextTick()

      expect(wrapper.find('[data-test="template-description-refused"]').text()).toBe(
        'group.validations.typeNotAllowed',
      )

      hiddenItem.dispatchEvent(new Event('mouseleave'))
      await wrapper.find('[data-test="template-card-public"]').trigger('click')

      expect(wrapper.find('[data-test="template-description-refused"]').exists()).toBe(false)
    })

    it('names the templates and explains the one pointed at, else focused, else picked', async () => {
      // Four cards each carrying their own sentence were as tall as the longest of them.
      const wrapper = mountWith(() => true, twoTemplates)
      const description = () => wrapper.find('[data-test="template-description"]')
      const card = (name) => wrapper.find(`[data-test="template-card-${name}"]`)

      expect(description().exists()).toBe(false)

      await card('channel').trigger('click')
      expect(wrapper.vm.describedTemplate).toBe('channel')
      expect(description().exists()).toBe(true)
      expect(card('channel').attributes('aria-describedby')).toBe('template-description')

      await card('hidden').element.parentElement.dispatchEvent(new Event('mouseenter'))
      expect(wrapper.vm.describedTemplate).toBe('hidden')

      await card('hidden').element.parentElement.dispatchEvent(new Event('mouseleave'))
      expect(wrapper.vm.describedTemplate).toBe('channel')

      card('hidden').element.dispatchEvent(new Event('focus'))
      await wrapper.vm.$nextTick()
      expect(wrapper.vm.describedTemplate).toBe('hidden')
    })

    it('holds every description in place, so pointing at a card does not move the form', async () => {
      // All of them stacked in one cell, the meant one visible: the line is as tall as the
      // longest before anything is pointed at, and stays that tall.
      const wrapper = mountWith(canExceptHidden, twoTemplates)
      const items = () => wrapper.findAll('.template-description__item')
      const shown = () => wrapper.findAll('.template-description__item--shown')

      expect(items()).toHaveLength(2)
      expect(shown()).toHaveLength(0)

      await wrapper
        .find('[data-test="template-card-hidden"]')
        .element.parentElement.dispatchEvent(new Event('mouseenter'))

      expect(items()).toHaveLength(2)
      expect(shown()).toHaveLength(1)
      expect(shown().at(0).attributes('id')).toBe('template-description')
    })

    it('keeps explaining the card under the cursor when focus leaves it, and vice versa', async () => {
      const wrapper = mountWith(() => true, twoTemplates)
      const card = (name) => wrapper.find(`[data-test="template-card-${name}"]`)
      await card('channel').trigger('click')

      card('hidden').element.parentElement.dispatchEvent(new Event('mouseenter'))
      card('hidden').element.dispatchEvent(new Event('focus'))
      card('hidden').element.dispatchEvent(new Event('blur'))
      await wrapper.vm.$nextTick()
      expect(wrapper.vm.describedTemplate).toBe('hidden')

      card('hidden').element.dispatchEvent(new Event('focus'))
      card('hidden').element.parentElement.dispatchEvent(new Event('mouseleave'))
      await wrapper.vm.$nextTick()
      expect(wrapper.vm.describedTemplate).toBe('hidden')

      card('hidden').element.dispatchEvent(new Event('blur'))
      await wrapper.vm.$nextTick()
      expect(wrapper.vm.describedTemplate).toBe('channel')
    })

    it('canCreateAnyGroup is false only when no type is permitted', () => {
      expect(mountWith(() => false).vm.canCreateAnyGroup).toBe(false)
      expect(mountWith((p) => p === 'group.create_closed').vm.canCreateAnyGroup).toBe(true)
    })

    describe('canCreateSelectedGroup before any type is chosen (formData.visibility === "")', () => {
      it('is true for someone who can create at least one type, e.g. an admin with every permission', () => {
        const wrapper = mountWith(() => true)
        expect(wrapper.vm.formData.visibility).toBe('')
        expect(wrapper.vm.canCreateSelectedGroup).toBe(true)
      })

      it('is false only for someone who cannot create any type at all', () => {
        const wrapper = mountWith(() => false)
        expect(wrapper.vm.formData.visibility).toBe('')
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
      wrapper.vm.formData.visibility = 'closed'
      expect(wrapper.vm.canCreateSelectedGroup).toBe(true)
      wrapper.vm.formData.visibility = 'public'
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
      const wrapper = mountEdit(() => false, { visibility: 'public' })
      const formSubmit = jest.spyOn(wrapper.vm, 'formSubmit').mockImplementation(() => {})
      wrapper.vm.formData.visibility = 'hidden'
      wrapper.vm.onSubmit()
      expect(formSubmit).not.toHaveBeenCalled()
    })

    it('allows editing an already-hidden group without group.create_hidden', () => {
      const wrapper = mountEdit(() => false, { visibility: 'hidden' })
      const formSubmit = jest.spyOn(wrapper.vm, 'formSubmit').mockImplementation(() => {})
      wrapper.vm.formData.visibility = 'hidden'
      wrapper.vm.onSubmit()
      expect(formSubmit).toHaveBeenCalled()
    })

    it('keeps the hidden option enabled when the group is already hidden', () => {
      const wrapper = mountEdit(() => false, { visibility: 'hidden' })
      const hiddenOption = wrapper
        .findAll('option')
        .wrappers.find((o) => o.attributes('value') === 'hidden')
      expect(hiddenOption.attributes('disabled')).toBeUndefined()
    })
  })

  describe('who may see the members', () => {
    // A right of the non-member role, set under Rights. The checkbox this form had for it wrote
    // that right on every save — so renaming a group undid a member list opened up there.
    const mountWithType = (update) =>
      mount(GroupForm, {
        propsData: { update, group: { ...group, visibility: 'closed', showMembers: true } },
        mocks: { $t: jest.fn(), $can: () => true },
        localVue,
        stubs,
        store,
      })

    it('is not asked here, on either form', () => {
      expect(mountWithType(false).find('#show-members').exists()).toBe(false)
      expect(mountWithType(true).find('#show-members').exists()).toBe(false)
    })

    it('is not written by a save of this form', () => {
      const wrapper = mountWithType(true)

      wrapper.vm.submit()

      expect(wrapper.emitted('updateGroup')[0][0]).not.toHaveProperty('showMembers')
    })
  })
})
