import { mount } from '@vue/test-utils'
import index from './index.vue'
import Vuex from 'vuex'

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
      })
      return mount(index, { store, mocks, localVue, ...options })
    }

    beforeEach(() => {
      options = {}
    })

    it('renders', () => {
      expect(Wrapper().element.tagName).toBe('DIV')
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
        wrapper.find('.ds-form').trigger('submit')

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
          wrapper.find('.ds-form').trigger('submit')

          expect(mocks.$apollo.mutate).toHaveBeenCalledWith(
            expect.objectContaining({
              variables: expect.objectContaining({
                name: 'Peter',
              }),
            }),
          )
        })
      })

      describe('given a new slug and hitting submit', () => {
        it('calls updateUser mutation', () => {
          const wrapper = Wrapper()

          wrapper.find('#slug').setValue('peter-der-lustige')
          wrapper.find('.ds-form').trigger('submit')

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
          wrapper.setData({
            cities: [
              {
                label: 'Berlin, Germany',
                value: 'Berlin, Germany',
                id: '1',
              },
            ],
          })
          await wrapper.vm.$nextTick()
          wrapper.find('.ds-select-option').trigger('click')
          wrapper.find('.ds-form').trigger('submit')

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
          wrapper.find('.ds-form').trigger('submit')

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

          wrapper.setData({
            cities: [
              {
                label: 'Berlin, Germany',
                value: 'Berlin, Germany',
                id: '1',
              },
              {
                label: 'Hamburg, Germany',
                value: 'Hamburg, Germany',
                id: '2',
              },
            ],
          })
          await wrapper.vm.$nextTick()
          wrapper.find('#name').setValue('Peter')
          wrapper.find('#slug').setValue('peter-der-lustige')
          wrapper.findAll('.ds-select-option').at(1).trigger('click')
          wrapper.find('#about').setValue('I am Peter!111elf')
          wrapper.find('.ds-form').trigger('submit')

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
        wrapper.find('#city').setValue('B')

        jest.runAllTimers()

        expect(mocks.$apollo.query).toHaveBeenCalledWith(
          expect.objectContaining({
            variables: expect.objectContaining({
              place: 'B',
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
  })
})
