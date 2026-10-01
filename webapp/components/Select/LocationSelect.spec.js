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

    it('renders the plain label, without echoing the current value', () => {
      expect(wrapper.find('label.ds-input-label').text()).toBe('settings.data.labelCity')
    })

    it('renders the select', () => {
      expect(wrapper.find('.ds-select').exists()).toBe(true)
    })

    it('renders the clearLocationName button by default', () => {
      expect(wrapper.find('button[data-test="clear-location-button"]').exists()).toBe(true)
    })

    it('calls apollo with given value', () => {
      expect(queryMock).toHaveBeenCalledWith({
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
        expect(queryMock).toHaveBeenCalledWith({
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

  describe('proximity from user store coordinates', () => {
    let getCurrentPositionSpy
    let originalGeolocation

    beforeEach(() => {
      queryMock.mockClear()
      originalGeolocation = global.navigator.geolocation
      getCurrentPositionSpy = jest.fn()
      Object.defineProperty(global.navigator, 'geolocation', {
        value: { getCurrentPosition: getCurrentPositionSpy },
        writable: true,
        configurable: true,
      })
      wrapper = mount(LocationSelect, {
        mocks: {
          ...mocks,
          $store: {
            state: { auth: { user: { location: { lng: 13.4, lat: 52.5 } } } },
          },
        },
        localVue,
        propsData: { value: 'nowhere' },
      })
    })

    afterEach(() => {
      Object.defineProperty(global.navigator, 'geolocation', {
        value: originalGeolocation,
        writable: true,
        configurable: true,
      })
    })

    it('passes user coordinates as proximity to the apollo query', () => {
      expect(queryMock).toHaveBeenCalledWith({
        query: queryLocations(),
        variables: {
          place: 'nowhere',
          lang: 'en',
          types: 'region,place,country',
          proximity: '13.4,52.5',
        },
        fetchPolicy: 'network-only',
      })
    })

    it('does not request browser geolocation when user coordinates are available', () => {
      expect(getCurrentPositionSpy).not.toHaveBeenCalled()
    })
  })

  describe('proximity from browser geolocation', () => {
    let originalGeolocation

    beforeEach(() => {
      queryMock.mockClear()
      originalGeolocation = global.navigator.geolocation
      Object.defineProperty(global.navigator, 'geolocation', {
        value: {
          getCurrentPosition: jest.fn((success) => {
            success({ coords: { longitude: 8.7, latitude: 50.1 } })
          }),
        },
        writable: true,
        configurable: true,
      })
      wrapper = mount(LocationSelect, { mocks, localVue, propsData: { value: 'nowhere' } })
    })

    afterEach(() => {
      Object.defineProperty(global.navigator, 'geolocation', {
        value: originalGeolocation,
        writable: true,
        configurable: true,
      })
    })

    it('passes browser geolocation coordinates as proximity to the apollo query', async () => {
      await wrapper.vm.$nextTick()
      expect(queryMock).toHaveBeenCalledWith({
        query: queryLocations(),
        variables: {
          place: 'nowhere',
          lang: 'en',
          types: 'region,place,country',
          proximity: '8.7,50.1',
        },
        fetchPolicy: 'network-only',
      })
    })

    it('uses proximity: null when browser geolocation is denied', async () => {
      Object.defineProperty(global.navigator, 'geolocation', {
        value: {
          getCurrentPosition: jest.fn((_success, error) => {
            error({ code: 1, message: 'Permission denied' })
          }),
        },
        writable: true,
        configurable: true,
      })
      queryMock.mockClear()
      const w = mount(LocationSelect, { mocks, localVue, propsData: { value: 'nowhere' } })
      await w.vm.$nextTick()
      expect(queryMock).toHaveBeenCalledWith({
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
  })

  // Regression test: a slow geocode response (debounce + proximity lookup + network) that
  // only lands after the user has already clicked away used to vanish into OcelotSelect's
  // `cities` prop unseen, and the next open() would then wipe the typed text back to '' (see
  // OcelotSelect.vue's open()) — showing an empty search box with the now-populated, but
  // unfiltered, results underneath instead of what the user actually typed.
  describe('a slow geocode response arriving after the field was closed', () => {
    let resolveQuery

    beforeEach(() => {
      jest.useFakeTimers()
      queryMock.mockClear()
      queryMock.mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveQuery = resolve
          }),
      )
      wrapper = mount(LocationSelect, { mocks, localVue, propsData: { value: '' } })
    })

    afterEach(() => {
      jest.useRealTimers()
    })

    it('keeps the typed text and filters the late results by it once reopened', async () => {
      const input = wrapper.find('#city')
      input.element.value = 'Niendorf, Hamburg, Deutschland'
      await input.trigger('input')
      jest.advanceTimersByTime(500)
      // requestGeoData awaits the (already-settled, no geolocation mock here) proximity
      // promise before it reaches $apollo.query — one tick to let it get there.
      await wrapper.vm.$nextTick()

      // Simulate a click outside while the request is still in flight.
      wrapper.vm.$refs.select.closeAndBlur()
      expect(wrapper.vm.$refs.select.isOpen).toBe(false)

      // The response only resolves now — after the field was already closed.
      resolveQuery({
        data: {
          queryLocations: [{ place_name: 'Niendorf, Hamburg, Deutschland', place_id: 'niendorf' }],
        },
      })
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      wrapper.vm.$refs.select.openAndFocus()
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.$refs.select.isOpen).toBe(true)
      expect(wrapper.vm.$refs.select.searchString).toBe('Niendorf, Hamburg, Deutschland')
      expect(wrapper.findAll('.ds-select-option').length).toBe(1)
      expect(wrapper.find('.ds-select-option').text()).toBe('Niendorf, Hamburg, Deutschland')
    })
  })
})
