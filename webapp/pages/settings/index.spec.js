import { mount } from '@vue/test-utils'
import flushPromises from 'flush-promises'
import index from './index.vue'
import Vuex from 'vuex'
import LocationSelect from '~/components/Select/LocationSelect'
import LocationPickerMap from '~/components/Map/LocationPickerMap'

const localVue = global.localVue

describe('index.vue', () => {
  let store
  let mocks
  let getters

  beforeEach(() => {
    mocks = {
      $i18n: { locale: () => 'en' },
      $t: jest.fn(),
      $apollo: {
        mutate: jest
          .fn()
          .mockRejectedValue({ message: 'Ouch!' })
          .mockResolvedValueOnce({
            data: {
              UpdateUser: {
                id: 'u1',
                slug: 'peter',
                name: 'Peter',
                locationName: 'Berlin',
                about: 'Smth',
              },
            },
          }),
        query: jest
          .fn()
          .mockRejectedValue({ message: 'Ouch!' })
          .mockResolvedValueOnce({
            data: {
              queryLocations: [
                {
                  place_name: 'Brazil',
                  id: 'country.9531777110682710',
                  __typename: 'LocationMapBox',
                },
                {
                  place_name: 'United Kingdom',
                  id: 'country.12405201072814600',
                  __typename: 'LocationMapBox',
                },
                {
                  place_name: 'Buenos Aires, Argentina',
                  id: 'place.7159025980072860',
                  __typename: 'LocationMapBox',
                },
                {
                  place_name: 'Bandung, West Java, Indonesia',
                  id: 'place.8224726664248590',
                  __typename: 'LocationMapBox',
                },
                {
                  place_name: 'Banten, Indonesia',
                  id: 'region.11849645724544000',
                  __typename: 'LocaLocationMapBoxtion2',
                },
              ],
            },
          }),
      },
      $toast: {
        error: jest.fn(),
        success: jest.fn(),
      },
      $policy: { get: () => false },
    }
    getters = {
      'auth/user': () => ({}),
    }
  })

  describe('mount', () => {
    let options
    const Wrapper = () => {
      store = new Vuex.Store({
        getters,
        mutations: { 'auth/SET_USER': jest.fn() },
      })
      return mount(index, { store, mocks, localVue, ...options })
    }

    beforeEach(() => {
      options = {}
    })

    it('renders', () => {
      expect(Wrapper().find('form').exists()).toBe(true)
    })

    it('formSchema computed returns schema with name and locationName', () => {
      const wrapper = Wrapper()
      expect(wrapper.vm.formSchema).toHaveProperty('name')
      expect(wrapper.vm.formSchema.name).toEqual({ required: true, min: 3, max: 50 })
      expect(wrapper.vm.formSchema).toHaveProperty('locationName')
    })

    describe('given form validation errors', () => {
      beforeEach(() => {
        options = {
          ...options,
          computed: {
            formSchema: () => ({
              slug: [
                (_rule, _value, callback) => {
                  callback(new Error('Ouch!'))
                },
              ],
            }),
          },
        }
      })

      it('cannot call updateUser mutation', () => {
        const wrapper = Wrapper()

        wrapper.find('#name').setValue('Peter')
        wrapper.find('form').trigger('submit')

        expect(mocks.$apollo.mutate).not.toHaveBeenCalled()
      })
    })

    describe('no form validation errors', () => {
      beforeEach(() => {
        options = { ...options, computed: { formSchema: () => ({}) } }
      })

      describe('given a new username and hitting submit', () => {
        it('calls updateUser mutation', () => {
          const wrapper = Wrapper()

          wrapper.find('#name').setValue('Peter')
          wrapper.find('form').trigger('submit')

          expect(mocks.$apollo.mutate).toHaveBeenCalledWith(
            expect.objectContaining({
              variables: expect.objectContaining({
                name: 'Peter',
              }),
            }),
          )
        })

        it('successful submit calls update callback and shows success toast', async () => {
          mocks.$apollo.mutate = jest.fn().mockImplementation(({ update }) => {
            if (update)
              update(null, {
                data: { UpdateUser: { id: 'u1', name: 'Peter', slug: 'peter' } },
              })
            return Promise.resolve()
          })
          const wrapper = Wrapper()

          wrapper.find('#name').setValue('Peter')
          wrapper.find('form').trigger('submit')
          await flushPromises()

          expect(mocks.$toast.success).toHaveBeenCalled()
        })

        it('failed submit shows error toast', async () => {
          mocks.$apollo.mutate = jest.fn().mockRejectedValue(new Error('Ouch'))
          const wrapper = Wrapper()

          wrapper.find('#name').setValue('Peter')
          wrapper.find('form').trigger('submit')
          await flushPromises()

          expect(mocks.$toast.error).toHaveBeenCalledWith('Ouch')
        })
      })

      describe('given a selection object as locationName', () => {
        // { label, value, ... } is the shape LocationSelect/LocationPickerMap
        // actually emit on a real pick — formLocationName reads .value (see
        // GroupForm.vue's own identical computed), not .label.
        it('extracts value from locationName', () => {
          const wrapper = Wrapper()
          wrapper.setData({
            formData: { locationName: { label: 'Berlin, Germany', value: 'Berlin, Germany' } },
          })
          wrapper.find('#name').setValue('Peter')
          wrapper.find('form').trigger('submit')

          expect(mocks.$apollo.mutate).toHaveBeenCalledWith(
            expect.objectContaining({
              variables: expect.objectContaining({
                locationName: 'Berlin, Germany',
              }),
            }),
          )
        })
      })

      describe('given a new slug and hitting submit', () => {
        it('calls updateUser mutation', () => {
          const wrapper = Wrapper()

          wrapper.find('#slug').setValue('peter-der-lustige')
          wrapper.find('form').trigger('submit')

          expect(mocks.$apollo.mutate).toHaveBeenCalledWith(
            expect.objectContaining({
              variables: expect.objectContaining({
                slug: 'peter-der-lustige',
              }),
            }),
          )
        })
      })

      describe('given a new location and hitting submit', () => {
        it('calls updateUser mutation', async () => {
          const wrapper = Wrapper()
          wrapper.findComponent(LocationSelect).vm.$emit('input', 'Berlin, Germany')
          wrapper.find('form').trigger('submit')

          await expect(mocks.$apollo.mutate).toHaveBeenCalledWith(
            expect.objectContaining({
              variables: expect.objectContaining({
                locationName: 'Berlin, Germany',
              }),
            }),
          )
        })
      })

      describe('given a new about and hitting submit', () => {
        it('calls updateUser mutation', () => {
          const wrapper = Wrapper()

          wrapper.find('#about').setValue('I am Peter!111elf')
          wrapper.find('form').trigger('submit')

          expect(mocks.$apollo.mutate).toHaveBeenCalledWith(
            expect.objectContaining({
              variables: expect.objectContaining({
                about: 'I am Peter!111elf',
              }),
            }),
          )
        })
      })

      describe('given new username, slug, location and about then hitting submit', () => {
        it('calls updateUser mutation', async () => {
          const wrapper = Wrapper()
          wrapper.find('#name').setValue('Peter')
          wrapper.find('#slug').setValue('peter-der-lustige')
          await wrapper.findComponent(LocationSelect).vm.$emit('input', 'Hamburg, Germany')
          wrapper.find('#about').setValue('I am Peter!111elf')
          wrapper.find('form').trigger('submit')

          await expect(mocks.$apollo.mutate).toHaveBeenCalledWith(
            expect.objectContaining({
              variables: expect.objectContaining({
                name: 'Peter',
                slug: 'peter-der-lustige',
                locationName: 'Hamburg, Germany',
                about: 'I am Peter!111elf',
              }),
            }),
          )
        })
      })
    })

    describe('given user input on location field', () => {
      it('calls queryLocations query', async () => {
        const wrapper = Wrapper()

        jest.useFakeTimers()

        wrapper.find('#city').trigger('input')
        wrapper.find('#city').setValue('Ber')

        jest.runAllTimers()
        await flushPromises()

        expect(mocks.$apollo.query).toHaveBeenCalledWith(
          expect.objectContaining({
            variables: expect.objectContaining({
              place: 'Ber',
            }),
          }),
        )
      })

      it('opens the dropdown', () => {
        const wrapper = Wrapper()

        wrapper.find('#city').trigger('input')
        wrapper.find('#city').setValue('B')

        expect(wrapper.find('.ds-select-dropdown').isVisible()).toBe(true)
      })
    })

    describe('given no user input on location field', () => {
      it('cannot call queryLocations query', async () => {
        const wrapper = Wrapper()

        jest.useFakeTimers()

        wrapper.find('#city').setValue('')
        wrapper.find('#city').trigger('input')

        jest.runAllTimers()

        expect(mocks.$apollo.query).not.toHaveBeenCalled()
      })

      it('does not show the dropdown', () => {
        const wrapper = Wrapper()

        wrapper.find('#city').setValue('')
        wrapper.find('#city').trigger('input')

        expect(wrapper.find('.ds-select-is-open').exists()).toBe(false)
      })
    })

    describe('given user presses escape on location field', () => {
      it('closes the dropdown', () => {
        const wrapper = Wrapper()

        wrapper.find('#city').setValue('B')
        wrapper.find('#city').trigger('input')

        expect(wrapper.find('.ds-select-dropdown').isVisible()).toBe(true)

        wrapper.find('#city').trigger('keyup.esc')

        expect(wrapper.find('.ds-select-is-open').exists()).toBe(false)
      })
    })

    // Same tracking GroupForm.vue uses for its own submit button/leave
    // guard — see its own tests for the full reasoning behind each case.
    describe('hasUnsavedChanges', () => {
      it('is false right after mount', () => {
        const wrapper = Wrapper()
        expect(wrapper.vm.hasUnsavedChanges()).toBe(false)
      })

      it('becomes true once a field goes through updateFormField (e.g. the name)', () => {
        const wrapper = Wrapper()
        wrapper.vm.updateFormField('name', 'A new name')
        expect(wrapper.vm.hasUnsavedChanges()).toBe(true)
      })

      it('becomes true once the location is genuinely changed (map)', () => {
        const wrapper = Wrapper()
        wrapper
          .findComponent(LocationPickerMap)
          .vm.$emit('input', { label: 'Berlin', value: 'Berlin', lat: 52.5, lng: 13.4 })
        expect(wrapper.vm.hasUnsavedChanges()).toBe(true)
      })

      it("stays false through LocationSelect's own mount-time auto-resolve of an already-saved location", () => {
        getters = { ...getters, 'auth/user': () => ({ locationName: 'Hamburg' }) }
        const wrapper = Wrapper()
        wrapper
          .findComponent(LocationSelect)
          .vm.$emit('input', { label: 'Hamburg, Germany', value: 'Hamburg, Germany', id: 'x' })
        expect(wrapper.vm.hasUnsavedChanges()).toBe(false)
      })

      it('resets to false once the change is actually saved', async () => {
        options = { computed: { formSchema: () => ({}) } }
        mocks.$apollo.mutate = jest.fn().mockResolvedValueOnce({
          data: { UpdateUser: { id: 'u1', name: 'A new name' } },
        })
        const wrapper = Wrapper()
        wrapper.vm.updateFormField('name', 'A new name')
        expect(wrapper.vm.hasUnsavedChanges()).toBe(true)

        wrapper.find('form').trigger('submit')
        await flushPromises()

        expect(mocks.$apollo.mutate).toHaveBeenCalled()
        expect(wrapper.vm.hasUnsavedChanges()).toBe(false)
      })

      it('does not reset when the save fails', async () => {
        options = { computed: { formSchema: () => ({}) } }
        mocks.$apollo.mutate = jest.fn().mockRejectedValueOnce({ message: 'boom' })
        const wrapper = Wrapper()
        wrapper.vm.updateFormField('name', 'A new name')

        wrapper.find('form').trigger('submit')
        await flushPromises()

        expect(mocks.$apollo.mutate).toHaveBeenCalled()
        expect(wrapper.vm.hasUnsavedChanges()).toBe(true)
      })
    })

    describe('submit button greyed-out-but-clickable state', () => {
      // Not an actual :disabled — see submitVisuallyDenied's own doc
      // comment: hasUnsavedChanges() only tracks whether something was
      // touched, not whether it truly differs from what's saved, so a
      // tracking gap must never make a real save unreachable.
      it('greys out the submit button with nothing changed yet, without marking it aria-disabled', () => {
        const wrapper = Wrapper()
        const submitButton = wrapper.find('button[type="submit"]')

        expect(submitButton.classes()).toContain('permission-denied')
        expect(submitButton.attributes('aria-disabled')).toBeUndefined()
      })

      it('un-greys the submit button once something has actually been changed', async () => {
        const wrapper = Wrapper()
        wrapper.vm.updateFormField('name', 'A new name')
        await wrapper.vm.$nextTick()

        const submitButton = wrapper.find('button[type="submit"]')
        expect(submitButton.classes()).not.toContain('permission-denied')
      })

      it('greys out the reset button the same way', async () => {
        const wrapper = Wrapper()
        const resetButton = wrapper.find('[data-test="reset-button"]')
        expect(resetButton.classes()).toContain('permission-denied')

        wrapper.vm.updateFormField('name', 'A new name')
        await wrapper.vm.$nextTick()
        expect(resetButton.classes()).not.toContain('permission-denied')
      })
    })

    describe('resetForm', () => {
      it('reverts touched fields back to the saved values', () => {
        getters = {
          ...getters,
          'auth/user': () => ({ name: 'Peter', slug: 'peter', about: 'Old bio' }),
        }
        const wrapper = Wrapper()
        wrapper.vm.updateFormField('name', 'A new name')
        wrapper.vm.updateFormField('slug', 'a-new-slug')
        wrapper.vm.updateFormField('about', 'A new bio')

        wrapper.vm.resetForm()

        expect(wrapper.vm.formData.name).toBe('Peter')
        expect(wrapper.vm.formData.slug).toBe('peter')
        expect(wrapper.vm.formData.about).toBe('Old bio')
      })

      it('clears hasUnsavedChanges', () => {
        const wrapper = Wrapper()
        wrapper.vm.updateFormField('name', 'A new name')
        expect(wrapper.vm.hasUnsavedChanges()).toBe(true)

        wrapper.vm.resetForm()

        expect(wrapper.vm.hasUnsavedChanges()).toBe(false)
      })

      it('reverts a genuinely changed location and clears the previous-location hint', () => {
        getters = { ...getters, 'auth/user': () => ({ locationName: 'Hamburg' }) }
        const wrapper = Wrapper()
        wrapper
          .findComponent(LocationSelect)
          .vm.$emit('input', { label: 'Hamburg, Germany', value: 'Hamburg, Germany', id: 'x' })
        wrapper.findComponent(LocationSelect).vm.$emit('input', 'Berlin')
        expect(wrapper.vm.previousLocationName).toBe('Hamburg')

        wrapper.vm.resetForm()

        expect(wrapper.vm.formData.locationName).toBe('Hamburg')
        expect(wrapper.vm.previousLocationName).toBeNull()
      })

      // Same reasoning as ignoreNextLocationInput's own mount-time doc
      // comment: writing formData.locationName back here can make
      // LocationSelect re-resolve it and echo an 'input' event — that echo
      // must not be mistaken for a genuine new pick right after resetting.
      it("suppresses LocationSelect's own resolve echo right after a reset", () => {
        getters = { ...getters, 'auth/user': () => ({ locationName: 'Hamburg' }) }
        const wrapper = Wrapper()
        wrapper.findComponent(LocationSelect).vm.$emit('input', 'Berlin')
        wrapper.vm.resetForm()

        wrapper
          .findComponent(LocationSelect)
          .vm.$emit('input', { label: 'Hamburg, Germany', value: 'Hamburg, Germany', id: 'x' })

        expect(wrapper.vm.locationChangedByUser).toBe(false)
      })
    })

    describe('previousLocationName', () => {
      // That built-in caption only ever echoes the field's CURRENT value
      // (see LocationSelect.vue), which isn't a useful comparison next to a
      // select that's already showing its own current value — the hint
      // below replaces it with a genuine previous-vs-current comparison,
      // same as GroupForm.vue's own identical setup.
      it('turns off LocationSelect\'s own built-in "previous value" caption', () => {
        getters = { ...getters, 'auth/user': () => ({ locationName: 'Hamburg' }) }
        const wrapper = Wrapper()
        expect(wrapper.findComponent(LocationSelect).props('showPreviousLocation')).toBe(false)
      })

      it('is null right after mount, before the location has been touched at all', () => {
        getters = { ...getters, 'auth/user': () => ({ locationName: 'Hamburg' }) }
        const wrapper = Wrapper()
        expect(wrapper.vm.previousLocationName).toBeNull()
      })

      it('reports the saved location once a genuine pick diverges from it', () => {
        getters = { ...getters, 'auth/user': () => ({ locationName: 'Hamburg' }) }
        const wrapper = Wrapper()
        // The suppressed mount-time auto-resolve happens first...
        wrapper
          .findComponent(LocationSelect)
          .vm.$emit('input', { label: 'Hamburg, Germany', value: 'Hamburg, Germany', id: 'x' })
        // ...then the user picks somewhere else.
        wrapper.findComponent(LocationSelect).vm.$emit('input', 'Berlin')
        expect(wrapper.vm.previousLocationName).toBe('Hamburg')
      })
    })

    describe('leaving the page with unsaved changes', () => {
      it('navigates straight through when there are no unsaved changes', () => {
        const wrapper = Wrapper()
        const next = jest.fn()
        wrapper.vm.$options.beforeRouteLeave.call(wrapper.vm, {}, {}, next)

        expect(next).toHaveBeenCalledWith()
        expect(wrapper.vm.showLeaveConfirmModal).toBe(false)
      })

      it('holds the navigation and opens the confirm modal when there are unsaved changes', () => {
        const wrapper = Wrapper()
        wrapper.vm.updateFormField('name', 'A new name')
        const next = jest.fn()
        wrapper.vm.$options.beforeRouteLeave.call(wrapper.vm, {}, {}, next)

        expect(next).not.toHaveBeenCalled()
        expect(wrapper.vm.showLeaveConfirmModal).toBe(true)
      })
    })

    describe('submitting coordinates', () => {
      beforeEach(() => {
        options = { computed: { formSchema: () => ({}) } }
      })

      it('sends lat/lng alongside locationName when a map pin/search result carries them', () => {
        const wrapper = Wrapper()
        wrapper.setData({
          formData: {
            locationName: {
              label: 'Berlin, Germany',
              value: 'Berlin, Germany',
              lat: 52.5,
              lng: 13.4,
            },
          },
        })
        wrapper.find('#name').setValue('Peter')
        wrapper.find('form').trigger('submit')

        expect(mocks.$apollo.mutate).toHaveBeenCalledWith(
          expect.objectContaining({
            variables: expect.objectContaining({
              locationName: 'Berlin, Germany',
              lat: 52.5,
              lng: 13.4,
            }),
          }),
        )
      })

      it('sends null lat/lng for unresolved, plain-text locationName', () => {
        const wrapper = Wrapper()
        wrapper.find('#name').setValue('Peter')
        wrapper.find('form').trigger('submit')

        expect(mocks.$apollo.mutate).toHaveBeenCalledWith(
          expect.objectContaining({
            variables: expect.objectContaining({ lat: null, lng: null }),
          }),
        )
      })
    })
  })
})
