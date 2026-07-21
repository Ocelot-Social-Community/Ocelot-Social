import { mount } from '@vue/test-utils'
import LocationSelect from './LocationSelect'
import { queryLocations } from '~/graphql/location'

const localVue = global.localVue
const propsData = { value: 'nowhere' }

let wrapper

const queryMock = jest.fn().mockResolvedValue({
  data: {
    queryLocations: [
      {
        place_name: 'Hamburg, Germany',
        place_id: 'xxx',
      },
    ],
  },
})

const mocks = {
  $t: jest.fn((string) => string),
  $i18n: {
    locale: () => 'en',
  },
  $apollo: {
    query: queryMock,
  },
}

describe('LocationSelect', () => {
  beforeEach(() => {})

  describe('mount', () => {
    const Wrapper = () => {
      return mount(LocationSelect, { mocks, localVue, propsData })
    }

    beforeEach(() => {
      wrapper = Wrapper()
    })

    it('renders the label with previous location by default', () => {
      expect(wrapper.find('label.ds-input-label').text()).toBe('settings.data.labelCity — nowhere')
    })

    it('renders the select', () => {
      expect(wrapper.find('.ds-select').exists()).toBe(true)
    })

    it('renders the clearLocationName button by default', () => {
      expect(wrapper.find('button[data-test="clear-location-button"]').exists()).toBe(true)
    })

    it('calls apollo with given value', () => {
      expect(queryMock).toBeCalledWith({
        query: queryLocations(),
        variables: {
          place: 'nowhere',
          lang: 'en',
          types: 'region,place,country',
          proximity: null,
        },
        fetchPolicy: 'network-only',
      })
    })

    describe('clearLocationName button click', () => {
      beforeEach(() => {
        wrapper.find('button[data-test="clear-location-button"]').trigger('click')
      })

      it('emits an empty string', () => {
        expect(wrapper.emitted().input).toBeTruthy()
        const lastEmit = wrapper.emitted().input[wrapper.emitted().input.length - 1]
        expect(lastEmit).toEqual([''])
      })
    })

    describe('canBeCleared is false', () => {
      beforeEach(() => {
        propsData.canBeCleared = false
        wrapper = Wrapper()
      })

      it('does not show clear location name button', () => {
        expect(wrapper.find('button[data-test="clear-location-button"]').exists()).toBe(false)
      })
    })

    describe('showPreviousLocation is false', () => {
      beforeEach(() => {
        propsData.showPreviousLocation = false
        wrapper = Wrapper()
      })

      it('does not show the previous location', () => {
        expect(wrapper.find('.ds-input-label').text()).toBe('settings.data.labelCity')
      })
    })

    describe('custom types prop', () => {
      beforeEach(() => {
        queryMock.mockClear()
        wrapper = mount(LocationSelect, {
          mocks,
          localVue,
          propsData: { value: 'nowhere', types: 'address' },
        })
      })

      it('forwards the types prop to apollo', () => {
        expect(queryMock).toBeCalledWith({
          query: queryLocations(),
          variables: {
            place: 'nowhere',
            lang: 'en',
            types: 'address',
            proximity: null,
          },
          fetchPolicy: 'network-only',
        })
      })
    })

    describe('short user input is ignored', () => {
      beforeEach(() => {
        queryMock.mockClear()
        jest.useFakeTimers()
        wrapper = mount(LocationSelect, { mocks, localVue, propsData: { value: '' } })
      })

      afterEach(() => {
        jest.useRealTimers()
      })

      it('does not call apollo for input shorter than 3 characters', () => {
        const input = wrapper.find('#city')
        input.element.value = 'ab'
        input.trigger('input')
        jest.runAllTimers()
        expect(queryMock).not.toHaveBeenCalled()
      })
    })
  })
})
