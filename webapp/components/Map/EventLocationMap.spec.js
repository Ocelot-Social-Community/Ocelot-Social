import { mount } from '@vue/test-utils'
import EventLocationMap from './EventLocationMap'
import { queryLocations } from '~/graphql/location'

const localVue = global.localVue

const stubs = {
  'client-only': true,
  OsLocationMap: true,
}

let mocks
let wrapper

const Wrapper = (propsData = {}) => {
  return mount(EventLocationMap, { mocks, localVue, propsData, stubs })
}

describe('EventLocationMap', () => {
  beforeEach(() => {
    mocks = {
      $t: jest.fn((string) => string),
      $i18n: { locale: () => 'en' },
      $env: { MAPBOX_TOKEN: 'test-token' },
      $apollo: { query: jest.fn() },
      $toast: { error: jest.fn() },
      $router: { push: jest.fn() },
    }
  })

  it('shows the alert instead of the map when no MAPBOX_TOKEN is configured', () => {
    mocks.$env = { MAPBOX_TOKEN: '' }
    wrapper = Wrapper()

    expect(wrapper.findComponent({ name: 'HcEmpty' }).exists()).toBe(true)
    expect(wrapper.findComponent({ name: 'OsLocationMap' }).exists()).toBe(false)
  })

  it('renders the location map when a MAPBOX_TOKEN is configured', () => {
    wrapper = Wrapper()

    expect(wrapper.findComponent({ name: 'HcEmpty' }).exists()).toBe(false)
    expect(wrapper.findComponent({ name: 'OsLocationMap' }).exists()).toBe(true)
  })

  describe('onPinChange', () => {
    // Same reverse-geocoding endpoint the address search already uses —
    // mapbox auto-detects a "lng,lat" search string.
    const resolvedLocation = (overrides = {}) => ({
      data: {
        queryLocations: [
          {
            id: 'poi.1',
            place_name: 'Alexanderplatz, Berlin',
            lat: 52.52,
            lng: 13.41,
            ...overrides,
          },
        ],
      },
    })

    it('emits the geocoded label and coordinates on success', async () => {
      mocks.$apollo.query.mockResolvedValue(resolvedLocation())
      wrapper = Wrapper()

      await wrapper.vm.onPinChange({ lat: 52.5, lng: 13.4 })

      expect(mocks.$apollo.query).toHaveBeenCalledWith({
        query: queryLocations(),
        variables: { place: '13.4,52.5', lang: 'en', types: 'address,poi,place' },
        fetchPolicy: 'network-only',
      })
      expect(wrapper.emitted('input')).toStrictEqual([
        [
          {
            label: 'Alexanderplatz, Berlin',
            value: 'Alexanderplatz, Berlin',
            id: 'poi.1',
            lat: 52.52,
            lng: 13.41,
          },
        ],
      ])
      expect(mocks.$toast.error).not.toHaveBeenCalled()
    })

    it('falls back to the raw coordinates when reverse-geocoding finds no match', async () => {
      mocks.$apollo.query.mockResolvedValue({ data: { queryLocations: [] } })
      wrapper = Wrapper()

      await wrapper.vm.onPinChange({ lat: 52.5, lng: 13.4 })

      expect(wrapper.emitted('input')).toStrictEqual([
        [
          {
            label: '52.50000, 13.40000',
            value: '52.50000, 13.40000',
            id: null,
            lat: 52.5,
            lng: 13.4,
          },
        ],
      ])
    })

    it('emits the coordinate fallback before showing a toast when reverse-geocoding fails', async () => {
      mocks.$apollo.query.mockRejectedValue(new Error('Network error'))
      wrapper = Wrapper()
      const emitSpy = jest.spyOn(wrapper.vm, '$emit')

      await wrapper.vm.onPinChange({ lat: 52.5, lng: 13.4 })

      expect(wrapper.emitted('input')).toStrictEqual([
        [
          {
            label: '52.50000, 13.40000',
            value: '52.50000, 13.40000',
            id: null,
            lat: 52.5,
            lng: 13.4,
          },
        ],
      ])
      expect(mocks.$toast.error).toHaveBeenCalledWith('Network error')

      const inputCallIndex = emitSpy.mock.calls.findIndex(([event]) => event === 'input')
      expect(emitSpy.mock.invocationCallOrder[inputCallIndex]).toBeLessThan(
        mocks.$toast.error.mock.invocationCallOrder[0],
      )
    })

    it('ignores a stale success response that resolves after a newer pin-change request', async () => {
      let resolveStale
      mocks.$apollo.query
        .mockImplementationOnce(() => new Promise((resolve) => (resolveStale = resolve)))
        .mockResolvedValueOnce(resolvedLocation({ id: 'poi.2', place_name: 'Second pin' }))
      wrapper = Wrapper()

      const stale = wrapper.vm.onPinChange({ lat: 1, lng: 1 })
      const current = wrapper.vm.onPinChange({ lat: 2, lng: 2 })
      resolveStale(resolvedLocation({ id: 'poi.1', place_name: 'First (stale) pin' }))
      await Promise.all([stale, current])

      expect(wrapper.emitted('input')).toHaveLength(1)
      expect(wrapper.emitted('input')[0][0]).toMatchObject({ id: 'poi.2', label: 'Second pin' })
    })

    it('ignores a stale error that rejects after a newer pin-change request', async () => {
      let rejectStale
      mocks.$apollo.query
        .mockImplementationOnce(() => new Promise((_resolve, reject) => (rejectStale = reject)))
        .mockResolvedValueOnce(resolvedLocation({ id: 'poi.2', place_name: 'Second pin' }))
      wrapper = Wrapper()

      const stale = wrapper.vm.onPinChange({ lat: 1, lng: 1 })
      const current = wrapper.vm.onPinChange({ lat: 2, lng: 2 })
      rejectStale(new Error('stale failure'))
      await Promise.all([stale, current])

      expect(mocks.$toast.error).not.toHaveBeenCalled()
      expect(wrapper.emitted('input')).toHaveLength(1)
      expect(wrapper.emitted('input')[0][0]).toMatchObject({ id: 'poi.2', label: 'Second pin' })
    })
  })
})
