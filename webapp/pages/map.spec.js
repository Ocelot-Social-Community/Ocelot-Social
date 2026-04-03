import mapboxgl from 'mapbox-gl'
import { mount } from '@vue/test-utils'
import VueMeta from 'vue-meta'
import Vuex from 'vuex'
import Map from './map'
import MapboxGeocoder from '@mapbox/mapbox-gl-geocoder'

jest.mock('@mapbox/mapbox-gl-geocoder', () => {
  return jest.fn().mockImplementation(() => {
    const mockParent = global.document.createElement('div')
    const container = global.document.createElement('div')
    mockParent.appendChild(container)
    return { container, clear: jest.fn() }
  })
})

jest.mock('mapbox-gl', () => {
  const popupInstance = {
    isOpen: jest.fn(() => false),
    remove: jest.fn(),
    setLngLat: jest.fn(() => popupInstance),
    setHTML: jest.fn(() => popupInstance),
    setDOMContent: jest.fn(() => popupInstance),
    addTo: jest.fn(() => popupInstance),
  }
  return {
    accessToken: null,
    GeolocateControl: jest.fn(),
    Map: jest.fn(() => ({
      addControl: jest.fn(),
      on: jest.fn(),
      remove: jest.fn(),
    })),
    NavigationControl: jest.fn(),
    Popup: jest.fn(() => popupInstance),
    __popupInstance: popupInstance,
  }
})

const localVue = global.localVue
localVue.use(VueMeta, { keyName: 'head' })

const onEventMocks = {}

const mapOnMock = jest.fn((key, ...args) => {
  onEventMocks[key] = args[args.length - 1]
})
const mapAddControlMock = jest.fn()
const mapAddSourceMock = jest.fn()
const mapAddLayerMock = jest.fn()
const mapAddImageMock = jest.fn()
const mapSetStyleMock = jest.fn()
const mapSetLayoutPropertyMock = jest.fn()
const mapFlyToMock = jest.fn()
const containerClickHandlers = []
const mapGetContainerMock = jest.fn(() => ({
  addEventListener: jest.fn((event, handler) => {
    if (event === 'click') containerClickHandlers.push(handler)
  }),
}))
const mapQueryRenderedFeaturesMock = jest.fn(() => [])

const mapLoadImageMock = jest.fn((url, callback) => {
  callback(null, 'image-data')
})

const mapGetStyleMock = jest.fn(() => ({
  layers: [
    { id: 'some-label', layout: {} },
    { id: 'water-fill', layout: {} },
  ],
}))

const mapMock = {
  on: mapOnMock,
  addControl: mapAddControlMock,
  addSource: mapAddSourceMock,
  addLayer: mapAddLayerMock,
  addImage: mapAddImageMock,
  loadImage: mapLoadImageMock,
  setStyle: mapSetStyleMock,
  setLayoutProperty: mapSetLayoutPropertyMock,
  flyTo: mapFlyToMock,
  getContainer: mapGetContainerMock,
  queryRenderedFeatures: mapQueryRenderedFeaturesMock,
  getStyle: mapGetStyleMock,
  getCanvas: jest.fn(() => ({
    style: { cursor: '' },
  })),
}

const stubs = {
  'client-only': {
    template: '<div><slot /></div>',
  },
  'mgl-map': {
    template: '<div class="mgl-map-stub"><slot /></div>',
  },
  MglFullscreenControl: true,
  MglNavigationControl: true,
  MglGeolocateControl: true,
  MglScaleControl: true,
  empty: true,
}

const currentUser = {
  id: 'u1',
  slug: 'peter',
  name: 'Peter Lustig',
  about: 'Some about text',
}

const userLocation = {
  id: 'loc1',
  name: 'Berlin',
  lng: 13.38333,
  lat: 52.51667,
}

const otherUsers = [
  {
    id: 'u2',
    slug: 'bob',
    name: 'Bob',
    about: 'Builder',
    location: { id: 'loc2', name: 'Hamburg', lng: 10.0, lat: 53.55 },
  },
  {
    id: 'u3',
    slug: 'jenny',
    name: 'Jenny',
    about: null,
    location: { id: 'loc3', name: 'Paris', lng: 2.35183, lat: 48.85658 },
  },
]

const groups = [
  {
    id: 'g1',
    slug: 'journalism',
    name: 'Investigative Journalism',
    about: 'Investigating things',
    location: { id: 'loc2', name: 'Hamburg', lng: 10.0, lat: 53.55 },
  },
]

const posts = [
  {
    id: 'e1',
    slug: 'kindergeburtstag',
    title: 'Kindergeburtstag',
    content: '<p>Fun event</p>',
    postType: 'Event',
    eventLocation: { id: 'loc4', name: 'Stuttgart', lng: 9.17702, lat: 48.78232 },
  },
]

describe('map', () => {
  let wrapper
  let mocks
  let store

  beforeEach(() => {
    jest.clearAllMocks()
    MapboxGeocoder.mockClear()
    containerClickHandlers.length = 0

    // Reset popup mock
    mapboxgl.__popupInstance.isOpen.mockReturnValue(false)

    mocks = {
      $t: (t) => t,
      $i18n: { locale: () => 'en' },
      $env: {
        MAPBOX_TOKEN: 'MY_MAPBOX_TOKEN',
      },
      $toast: {
        error: jest.fn(),
      },
      $apollo: {
        query: jest.fn().mockResolvedValue({
          data: { User: [{ location: null }] },
        }),
      },
      $filters: {
        removeHtml: jest.fn((html) => html.replace(/<[^>]*>/g, '')),
      },
    }

    store = new Vuex.Store({
      getters: { 'auth/user': () => currentUser },
    })
  })

  const createWrapper = () => {
    return mount(Map, {
      mocks,
      localVue,
      stubs,
      store,
    })
  }

  describe('without MAPBOX_TOKEN', () => {
    beforeEach(() => {
      mocks.$env.MAPBOX_TOKEN = ''
      wrapper = createWrapper()
    })

    it('shows empty alert', () => {
      expect(wrapper.find('empty-stub').exists()).toBe(true)
    })

    it('does not render map', () => {
      expect(wrapper.find('.mgl-map-stub').exists()).toBe(false)
    })
  })

  describe('with MAPBOX_TOKEN', () => {
    beforeEach(() => {
      wrapper = createWrapper()
    })

    it('renders map page', () => {
      expect(wrapper.find('.map-page').exists()).toBe(true)
    })

    it('has correct <head> content', () => {
      expect(wrapper.vm.$metaInfo.title).toBe('map.pageTitle')
    })

    it('renders legend with all marker types', () => {
      const items = wrapper.findAll('.map-legend-item')
      expect(items.length).toBe(4)
    })

    it('legend is closed by default on mobile', () => {
      expect(wrapper.vm.legendOpen).toBe(false)
    })

    describe('legend toggle', () => {
      it('toggles legendOpen on click', async () => {
        const toggle = wrapper.find('.map-legend-toggle')
        await toggle.trigger('click')
        expect(wrapper.vm.legendOpen).toBe(true)
        await toggle.trigger('click')
        expect(wrapper.vm.legendOpen).toBe(false)
      })

      it('shows arrow up when closed', () => {
        expect(wrapper.find('.map-legend-arrow').text()).toBe('▲')
      })

      it('shows arrow down when open', async () => {
        await wrapper.find('.map-legend-toggle').trigger('click')
        expect(wrapper.find('.map-legend-arrow').text()).toBe('▼')
      })
    })

    describe('computed properties', () => {
      it('mapCenter returns default center without user location', () => {
        expect(wrapper.vm.mapCenter).toEqual([10.452764, 51.165707])
      })

      it('mapZoom returns 4 without user location', () => {
        expect(wrapper.vm.mapZoom).toBe(4)
      })

      it('mapCenter returns user coordinates when available', async () => {
        await wrapper.setData({ currentUserCoordinates: [13.38, 52.52] })
        expect(wrapper.vm.mapCenter).toEqual([13.38, 52.52])
      })

      it('mapZoom returns 10 when user has location', async () => {
        await wrapper.setData({ currentUserCoordinates: [13.38, 52.52] })
        expect(wrapper.vm.mapZoom).toBe(10)
      })

      it('availableStyles has 4 styles with titles', () => {
        const styles = wrapper.vm.availableStyles
        expect(Object.keys(styles)).toEqual(['outdoors', 'streets', 'satellite', 'dark'])
        expect(styles.outdoors.title).toBe('map.styles.outdoors')
      })

      it('mapOptions uses outdoors style by default', () => {
        expect(wrapper.vm.mapOptions.style).toContain('outdoors')
      })

      it('mapOptions uses activeStyle when set', async () => {
        await wrapper.setData({ activeStyle: 'mapbox://custom' })
        expect(wrapper.vm.mapOptions.style).toBe('mapbox://custom')
      })

      it('isPreparedForMarkers is false initially', () => {
        expect(wrapper.vm.isPreparedForMarkers).toBe(false)
      })
    })

    describe('updateMapPosition', () => {
      it('sets top from navbar height', () => {
        const navbar = document.createElement('div')
        navbar.id = 'navbar'
        Object.defineProperty(navbar, 'offsetHeight', { value: 60 })
        document.body.appendChild(navbar)
        wrapper.vm.updateMapPosition()
        expect(wrapper.vm.$el.style.top).toBe('60px')
        document.body.removeChild(navbar)
      })

      it('sets bottom to 0 when footer is hidden', () => {
        wrapper.vm.updateMapPosition()
        expect(wrapper.vm.$el.style.bottom).toBe('0px')
      })

      it('sets bottom from footer height when visible', () => {
        const footer = document.createElement('div')
        footer.id = 'footer'
        Object.defineProperty(footer, 'offsetHeight', { value: 40 })
        document.body.appendChild(footer)
        wrapper.vm.updateMapPosition()
        expect(wrapper.vm.$el.style.bottom).toBe('40px')
        document.body.removeChild(footer)
      })
    })

    describe('onMapLoad', () => {
      beforeEach(async () => {
        wrapper.vm.onMapLoad({ map: mapMock })
      })

      it('registers style.load event', () => {
        expect(mapOnMock).toHaveBeenCalledWith('style.load', expect.any(Function))
      })

      it('registers mouseenter event on markers layer', () => {
        expect(mapOnMock).toHaveBeenCalledWith('mouseenter', 'markers', expect.any(Function))
      })

      it('registers mouseleave event on markers layer', () => {
        expect(mapOnMock).toHaveBeenCalledWith('mouseleave', 'markers', expect.any(Function))
      })

      it('registers click event on markers layer', () => {
        expect(mapOnMock).toHaveBeenCalledWith('click', 'markers', expect.any(Function))
      })

      it('adds geocoder control', () => {
        expect(MapboxGeocoder).toHaveBeenCalledWith(
          expect.objectContaining({
            accessToken: 'MY_MAPBOX_TOKEN',
            marker: false,
          }),
        )
        expect(mapAddControlMock).toHaveBeenCalled()
      })

      it('adds style switcher control', () => {
        // style switcher is the second addControl call (after geocoder)
        const styleSwitcherCall = mapAddControlMock.mock.calls.find(
          (call) => call[1] === 'top-right' && call[0].onAdd,
        )
        expect(styleSwitcherCall).toBeTruthy()
      })

      it('creates popup', () => {
        expect(mapboxgl.Popup).toHaveBeenCalledWith({
          closeButton: true,
          closeOnClick: true,
          maxWidth: '300px',
        })
      })

      it('calls loadMarkersIconsAndAddMarkers', () => {
        expect(mapLoadImageMock).toHaveBeenCalled()
      })

      describe('style.load event', () => {
        it('reloads marker icons', () => {
          mapLoadImageMock.mockClear()
          mapAddImageMock.mockClear()
          onEventMocks['style.load']()
          expect(mapLoadImageMock).toHaveBeenCalledTimes(4)
        })

        it('re-adds source and layer after style change when markers exist', async () => {
          // Prepare marker data so addMarkersOnCheckPrepared adds source/layer
          await wrapper.setData({
            users: otherUsers,
            groups,
            posts,
            currentUserCoordinates: null,
            currentUserLocation: null,
          })
          wrapper.vm.markers.isGeoJSON = true
          wrapper.vm.markers.isSourceAndLayerAdded = true

          mapAddSourceMock.mockClear()
          mapAddLayerMock.mockClear()

          onEventMocks['style.load']()

          // loadMarkersIconsAndAddMarkers uses Promise.all().then() — flush microtasks
          await wrapper.vm.$nextTick()

          // After style.load, isSourceAndLayerAdded is reset and icons reload,
          // then addMarkersOnCheckPrepared re-adds source and layer
          expect(wrapper.vm.markers.isSourceAndLayerAdded).toBe(true)
          expect(mapAddSourceMock).toHaveBeenCalledWith('markers', expect.any(Object))
          expect(mapAddLayerMock).toHaveBeenCalledWith(
            expect.objectContaining({ id: 'markers', type: 'symbol' }),
          )
        })
      })

      describe('style switcher control', () => {
        let container

        beforeEach(() => {
          const styleSwitcherCall = mapAddControlMock.mock.calls.find(
            (call) => call[1] === 'top-right' && call[0].onAdd,
          )
          container = styleSwitcherCall[0].onAdd()
        })

        it('creates container with correct class', () => {
          expect(container.className).toBe('mapboxgl-ctrl map-style-switcher')
        })

        it('has a toggle button', () => {
          const toggle = container.querySelector('.map-style-switcher-toggle')
          expect(toggle).toBeTruthy()
          expect(toggle.querySelector('svg')).toBeTruthy()
        })

        it('has a popover with 4 style buttons', () => {
          const buttons = container.querySelectorAll('.map-style-popover-btn')
          expect(buttons.length).toBe(4)
        })

        it('marks active style', () => {
          const active = container.querySelector('.map-style-popover-btn--active')
          expect(active).toBeTruthy()
        })

        it('toggle opens popover', () => {
          const toggle = container.querySelector('.map-style-switcher-toggle')
          const popover = container.querySelector('.map-style-popover')
          toggle.click()
          expect(popover.classList.contains('map-style-popover--open')).toBe(true)
        })

        it('toggle closes popover on second click', () => {
          const toggle = container.querySelector('.map-style-switcher-toggle')
          const popover = container.querySelector('.map-style-popover')
          toggle.click()
          toggle.click()
          expect(popover.classList.contains('map-style-popover--open')).toBe(false)
        })

        it('clicking on map closes popover', () => {
          const popover = container.querySelector('.map-style-popover')
          popover.classList.add('map-style-popover--open')
          containerClickHandlers.forEach((handler) => handler())
          expect(popover.classList.contains('map-style-popover--open')).toBe(false)
        })

        it('clicking style button sets correct style and closes popover', () => {
          const buttons = container.querySelectorAll('.map-style-popover-btn')
          const popover = container.querySelector('.map-style-popover')
          popover.classList.add('map-style-popover--open')
          // Click "streets" button (index 1)
          buttons[1].click()
          expect(mapSetStyleMock).toHaveBeenCalledWith(wrapper.vm.availableStyles.streets.url)
          expect(wrapper.vm.activeStyle).toBe(wrapper.vm.availableStyles.streets.url)
          expect(popover.classList.contains('map-style-popover--open')).toBe(false)
          expect(buttons[1].classList.contains('map-style-popover-btn--active')).toBe(true)
          // Previous active button should no longer be active
          expect(buttons[0].classList.contains('map-style-popover-btn--active')).toBe(false)
        })
      })

      describe('mouseenter event', () => {
        const features = [
          {
            geometry: { coordinates: [10.0, 53.55] },
            properties: {
              type: 'user',
              slug: 'bob',
              id: 'u2',
              name: 'Bob',
              locationName: 'Hamburg',
              description: 'Builder',
            },
          },
        ]

        const getPopupDOM = () => mapboxgl.__popupInstance.setDOMContent.mock.calls[0][0]

        it('shows popup when features found', () => {
          mapQueryRenderedFeaturesMock.mockReturnValueOnce(features)
          onEventMocks.mouseenter({
            point: { x: 100, y: 200 },
            lngLat: { lng: 10.0, lat: 53.55 },
          })
          expect(mapboxgl.__popupInstance.setLngLat).toHaveBeenCalled()
          expect(mapboxgl.__popupInstance.setDOMContent).toHaveBeenCalled()
          expect(mapboxgl.__popupInstance.addTo).toHaveBeenCalledWith(mapMock)
        })

        it('does not show popup when no features', () => {
          mapQueryRenderedFeaturesMock.mockReturnValueOnce([])
          onEventMocks.mouseenter({
            point: { x: 100, y: 200 },
            lngLat: { lng: 10.0, lat: 53.55 },
          })
          expect(mapboxgl.__popupInstance.setLngLat).not.toHaveBeenCalled()
        })

        it('popup includes location name header', () => {
          mapQueryRenderedFeaturesMock.mockReturnValueOnce(features)
          onEventMocks.mouseenter({
            point: { x: 100, y: 200 },
            lngLat: { lng: 10.0, lat: 53.55 },
          })
          const dom = getPopupDOM()
          const header = dom.querySelector('.map-popup-header')
          expect(header).toBeTruthy()
          expect(header.textContent).toBe('Hamburg')
        })

        it('popup includes user name and profile link', () => {
          mapQueryRenderedFeaturesMock.mockReturnValueOnce(features)
          onEventMocks.mouseenter({
            point: { x: 100, y: 200 },
            lngLat: { lng: 10.0, lat: 53.55 },
          })
          const dom = getPopupDOM()
          expect(dom.textContent).toContain('Bob')
          const link = dom.querySelector('a')
          expect(link.textContent).toBe('@bob')
          expect(link.getAttribute('href')).toBe('/profile/u2/bob')
          expect(link.getAttribute('rel')).toBe('noopener noreferrer')
        })

        it('popup includes description when present', () => {
          mapQueryRenderedFeaturesMock.mockReturnValueOnce(features)
          onEventMocks.mouseenter({
            point: { x: 100, y: 200 },
            lngLat: { lng: 10.0, lat: 53.55 },
          })
          const dom = getPopupDOM()
          expect(dom.textContent).toContain('Builder')
        })

        it('popup shows multiple features separated by hr', () => {
          const multiFeatures = [
            ...features,
            {
              geometry: { coordinates: [10.0, 53.55] },
              properties: {
                type: 'group',
                slug: 'journalism',
                id: 'g1',
                name: 'Journalism',
                locationName: 'Hamburg',
                description: '',
              },
            },
          ]
          mapQueryRenderedFeaturesMock.mockReturnValueOnce(multiFeatures)
          onEventMocks.mouseenter({
            point: { x: 100, y: 200 },
            lngLat: { lng: 10.0, lat: 53.55 },
          })
          const dom = getPopupDOM()
          expect(dom.querySelectorAll('hr').length).toBe(1)
          const links = dom.querySelectorAll('a')
          expect(links[1].textContent).toBe('&journalism')
          expect(links[1].getAttribute('href')).toBe('/groups/g1/journalism')
        })

        it('removes existing popup before showing new one', () => {
          mapboxgl.__popupInstance.isOpen.mockReturnValueOnce(true)
          mapQueryRenderedFeaturesMock.mockReturnValueOnce(features)
          onEventMocks.mouseenter({
            point: { x: 100, y: 200 },
            lngLat: { lng: 10.0, lat: 53.55 },
          })
          expect(mapboxgl.__popupInstance.remove).toHaveBeenCalled()
        })

        it('adjusts coordinates for wrapped map', () => {
          const wrappedFeatures = [
            {
              geometry: { coordinates: [370.0, 53.55] },
              properties: {
                type: 'user',
                slug: 'bob',
                id: 'u2',
                name: 'Bob',
                locationName: 'Hamburg',
                description: '',
              },
            },
          ]
          mapQueryRenderedFeaturesMock.mockReturnValueOnce(wrappedFeatures)
          onEventMocks.mouseenter({
            point: { x: 100, y: 200 },
            lngLat: { lng: 10.0, lat: 53.55 },
          })
          const coords = mapboxgl.__popupInstance.setLngLat.mock.calls[0][0]
          expect(coords[0]).toBe(10.0)
        })
      })

      describe('mouseleave event', () => {
        it('resets cursor style', () => {
          onEventMocks.mouseleave()
          expect(mapMock.getCanvas().style.cursor).toBe('')
        })
      })

      describe('click event on markers', () => {
        const features = [
          {
            geometry: { coordinates: [10.0, 53.55] },
            properties: {
              type: 'user',
              slug: 'bob',
              id: 'u2',
              name: 'Bob',
              locationName: 'Hamburg',
              description: '',
            },
          },
        ]

        it('shows popup and stops propagation', () => {
          const stopPropagation = jest.fn()
          mapQueryRenderedFeaturesMock.mockReturnValueOnce(features)
          onEventMocks.click({
            point: { x: 100, y: 200 },
            lngLat: { lng: 10.0, lat: 53.55 },
            originalEvent: { stopPropagation },
          })
          expect(mapboxgl.__popupInstance.setLngLat).toHaveBeenCalled()
          expect(stopPropagation).toHaveBeenCalled()
        })

        it('does nothing when no features found', () => {
          mapQueryRenderedFeaturesMock.mockReturnValueOnce([])
          onEventMocks.click({
            point: { x: 100, y: 200 },
            lngLat: { lng: 10.0, lat: 53.55 },
            originalEvent: { stopPropagation: jest.fn() },
          })
          expect(mapboxgl.__popupInstance.setLngLat).not.toHaveBeenCalled()
        })
      })

      describe('popup content for different marker types', () => {
        const getPopupDOMForType = () => mapboxgl.__popupInstance.setDOMContent.mock.calls[0][0]

        it('generates correct link for event type', () => {
          const eventFeatures = [
            {
              geometry: { coordinates: [9.17, 48.78] },
              properties: {
                type: 'event',
                slug: 'party',
                id: 'e1',
                name: 'Party',
                locationName: 'Stuttgart',
                description: '',
              },
            },
          ]
          mapQueryRenderedFeaturesMock.mockReturnValueOnce(eventFeatures)
          onEventMocks.mouseenter({
            point: { x: 100, y: 200 },
            lngLat: { lng: 9.17, lat: 48.78 },
          })
          const dom = getPopupDOMForType()
          const link = dom.querySelector('a')
          expect(link.getAttribute('href')).toBe('/post/e1/party')
          expect(link.textContent).toBe('party')
        })

        it('generates correct link for theUser type', () => {
          const userFeatures = [
            {
              geometry: { coordinates: [13.38, 52.52] },
              properties: {
                type: 'theUser',
                slug: 'peter',
                id: 'u1',
                name: 'Peter',
                locationName: 'Berlin',
                description: '',
              },
            },
          ]
          mapQueryRenderedFeaturesMock.mockReturnValueOnce(userFeatures)
          onEventMocks.mouseenter({
            point: { x: 100, y: 200 },
            lngLat: { lng: 13.38, lat: 52.52 },
          })
          const dom = getPopupDOMForType()
          const link = dom.querySelector('a')
          expect(link.getAttribute('href')).toBe('/profile/u1/peter')
          expect(link.textContent).toBe('@peter')
        })

        it('omits location header when locationName is empty', () => {
          const features = [
            {
              geometry: { coordinates: [10.0, 53.55] },
              properties: {
                type: 'user',
                slug: 'bob',
                id: 'u2',
                name: 'Bob',
                locationName: '',
                description: '',
              },
            },
          ]
          mapQueryRenderedFeaturesMock.mockReturnValueOnce(features)
          onEventMocks.mouseenter({
            point: { x: 100, y: 200 },
            lngLat: { lng: 10.0, lat: 53.55 },
          })
          const dom = getPopupDOMForType()
          expect(dom.querySelector('.map-popup-header')).toBeNull()
        })
      })

      describe('loadMarkersIconsAndAddMarkers', () => {
        it('loads all 4 marker icon images', () => {
          expect(mapLoadImageMock).toHaveBeenCalledTimes(4)
          expect(mapLoadImageMock).toHaveBeenCalledWith(
            'img/mapbox/marker-icons/mapbox-marker-icon-20px-orange.png',
            expect.any(Function),
          )
        })

        it('adds images to map', () => {
          expect(mapAddImageMock).toHaveBeenCalledTimes(4)
          expect(mapAddImageMock).toHaveBeenCalledWith('marker-orange', 'image-data')
          expect(mapAddImageMock).toHaveBeenCalledWith('marker-green', 'image-data')
        })

        it('sets isImagesLoaded to true', () => {
          expect(wrapper.vm.markers.isImagesLoaded).toBe(true)
        })

        it('calls language to set label layers', () => {
          expect(mapSetLayoutPropertyMock).toHaveBeenCalledWith('some-label', 'text-field', [
            'get',
            'name',
          ])
        })

        it('does not set layout on non-label layers', () => {
          expect(mapSetLayoutPropertyMock).not.toHaveBeenCalledWith(
            'water-fill',
            expect.anything(),
            expect.anything(),
          )
        })
      })

      describe('setStyle', () => {
        it('sets map style and activeStyle', () => {
          wrapper.vm.setStyle('mapbox://styles/mapbox/dark-v10')
          expect(mapSetStyleMock).toHaveBeenCalledWith('mapbox://styles/mapbox/dark-v10')
          expect(wrapper.vm.activeStyle).toBe('mapbox://styles/mapbox/dark-v10')
        })
      })

      describe('addMarkersOnCheckPrepared with data', () => {
        beforeEach(async () => {
          await wrapper.setData({
            users: otherUsers,
            groups,
            posts,
            currentUserCoordinates: [13.38333, 52.51667],
            currentUserLocation: userLocation,
          })
          wrapper.vm.addMarkersOnCheckPrepared()
        })

        it('creates geoJSON features for users', () => {
          const userFeatures = wrapper.vm.markers.geoJSON.filter(
            (f) => f.properties.type === 'user',
          )
          expect(userFeatures.length).toBe(2)
        })

        it('excludes current user from user features', () => {
          const currentUserFeature = wrapper.vm.markers.geoJSON.find(
            (f) => f.properties.type === 'user' && f.properties.id === 'u1',
          )
          expect(currentUserFeature).toBeUndefined()
        })

        it('creates geoJSON feature for current user', () => {
          const theUserFeature = wrapper.vm.markers.geoJSON.find(
            (f) => f.properties.type === 'theUser',
          )
          expect(theUserFeature).toBeTruthy()
          expect(theUserFeature.properties.iconRotate).toBe(45.0)
          expect(theUserFeature.properties.locationName).toBe('Berlin')
        })

        it('creates geoJSON features for groups', () => {
          const groupFeatures = wrapper.vm.markers.geoJSON.filter(
            (f) => f.properties.type === 'group',
          )
          expect(groupFeatures.length).toBe(1)
          expect(groupFeatures[0].properties.locationName).toBe('Hamburg')
        })

        it('creates geoJSON features for events', () => {
          const eventFeatures = wrapper.vm.markers.geoJSON.filter(
            (f) => f.properties.type === 'event',
          )
          expect(eventFeatures.length).toBe(1)
          expect(eventFeatures[0].properties.locationName).toBe('Stuttgart')
        })

        it('adds source and layer to map', () => {
          expect(mapAddSourceMock).toHaveBeenCalledWith(
            'markers',
            expect.objectContaining({ type: 'geojson' }),
          )
          expect(mapAddLayerMock).toHaveBeenCalledWith(
            expect.objectContaining({ id: 'markers', type: 'symbol' }),
          )
        })

        it('calls flyTo', () => {
          expect(mapFlyToMock).toHaveBeenCalledWith({
            center: [13.38333, 52.51667],
            zoom: 10,
          })
        })

        it('sets isGeoJSON and isSourceAndLayerAdded to true', () => {
          expect(wrapper.vm.markers.isGeoJSON).toBe(true)
          expect(wrapper.vm.markers.isSourceAndLayerAdded).toBe(true)
        })

        describe('coordinate nudging for overlapping markers', () => {
          it('nudges markers of different types at same coordinates', () => {
            // User Bob and Group are both at Hamburg (10.0, 53.55)
            const bobFeature = wrapper.vm.markers.geoJSON.find((f) => f.properties.id === 'u2')
            const groupFeature = wrapper.vm.markers.geoJSON.find((f) => f.properties.id === 'g1')
            // They should have different lng coordinates after nudging
            expect(bobFeature.geometry.coordinates[0]).not.toBe(
              groupFeature.geometry.coordinates[0],
            )
            // But same lat
            expect(bobFeature.geometry.coordinates[1]).toBe(groupFeature.geometry.coordinates[1])
          })

          it('does not nudge markers of the same type at the same location', async () => {
            // Reset geoJSON and flags to re-run with custom data
            wrapper.vm.markers.geoJSON = []
            wrapper.vm.markers.isGeoJSON = false
            wrapper.vm.markers.isSourceAndLayerAdded = true
            wrapper.vm.markers.isFlyToCenter = true

            const sameLocationUsers = [
              {
                id: 'u10',
                slug: 'alice',
                name: 'Alice',
                about: null,
                location: { id: 'loc2', name: 'Hamburg', lng: 10.0, lat: 53.55 },
              },
              {
                id: 'u11',
                slug: 'charlie',
                name: 'Charlie',
                about: null,
                location: { id: 'loc2', name: 'Hamburg', lng: 10.0, lat: 53.55 },
              },
            ]
            await wrapper.setData({
              users: sameLocationUsers,
              groups: [],
              posts: [],
              currentUserCoordinates: null,
              currentUserLocation: null,
            })
            wrapper.vm.addMarkersOnCheckPrepared()

            const userFeatures = wrapper.vm.markers.geoJSON.filter(
              (f) => f.properties.type === 'user',
            )
            expect(userFeatures.length).toBe(2)
            // Same type at same location — coordinates must remain identical
            expect(userFeatures[0].geometry.coordinates[0]).toBe(
              userFeatures[1].geometry.coordinates[0],
            )
            expect(userFeatures[0].geometry.coordinates[1]).toBe(
              userFeatures[1].geometry.coordinates[1],
            )
          })
        })
      })

      describe('addMarkersOnCheckPrepared without current user coordinates', () => {
        beforeEach(async () => {
          await wrapper.setData({
            users: otherUsers,
            groups,
            posts,
            currentUserCoordinates: null,
            currentUserLocation: null,
          })
          wrapper.vm.addMarkersOnCheckPrepared()
        })

        it('does not create theUser feature', () => {
          const theUserFeature = wrapper.vm.markers.geoJSON.find(
            (f) => f.properties.type === 'theUser',
          )
          expect(theUserFeature).toBeUndefined()
        })

        it('flies to default center', () => {
          expect(mapFlyToMock).toHaveBeenCalledWith({
            center: [10.452764, 51.165707],
            zoom: 4,
          })
        })
      })

      describe('mapFlyToCenter', () => {
        it('calls map.flyTo', () => {
          mapFlyToMock.mockClear()
          wrapper.vm.mapFlyToCenter()
          expect(mapFlyToMock).toHaveBeenCalled()
        })
      })
    })

    describe('getUserLocation', () => {
      it('returns location when user has one', async () => {
        mocks.$apollo.query.mockResolvedValueOnce({
          data: { User: [{ location: userLocation }] },
        })
        const result = await wrapper.vm.getUserLocation('u1')
        expect(result).toEqual(userLocation)
      })

      it('returns null when user has no location', async () => {
        mocks.$apollo.query.mockResolvedValueOnce({
          data: { User: [{ location: null }] },
        })
        const result = await wrapper.vm.getUserLocation('u1')
        expect(result).toBeNull()
      })

      it('returns null when no user found', async () => {
        mocks.$apollo.query.mockResolvedValueOnce({
          data: { User: [] },
        })
        const result = await wrapper.vm.getUserLocation('u1')
        expect(result).toBeNull()
      })

      it('shows toast error on failure', async () => {
        mocks.$apollo.query.mockRejectedValueOnce(new Error('Network error'))
        const result = await wrapper.vm.getUserLocation('u1')
        expect(result).toBeNull()
        expect(mocks.$toast.error).toHaveBeenCalledWith('Network error')
      })
    })

    describe('getCoordinates', () => {
      it('returns [lng, lat] array', () => {
        expect(wrapper.vm.getCoordinates({ lng: 10.0, lat: 53.55 })).toEqual([10.0, 53.55])
      })
    })

    describe('isPreparedForMarkers watcher', () => {
      it('calls addMarkersOnCheckPrepared when ready', async () => {
        const spy = jest.spyOn(wrapper.vm, 'addMarkersOnCheckPrepared')
        wrapper.vm.onMapLoad({ map: mapMock })
        await wrapper.setData({
          users: otherUsers,
          groups,
          posts,
        })
        await wrapper.vm.$nextTick()
        expect(spy).toHaveBeenCalled()
      })
    })

    describe('mounted with user location', () => {
      it('sets currentUserCoordinates from location', async () => {
        mocks.$apollo.query.mockResolvedValue({
          data: { User: [{ location: userLocation }] },
        })
        const w = createWrapper()
        await w.vm.$nextTick()
        await w.vm.$nextTick()
        expect(w.vm.currentUserCoordinates).toEqual([13.38333, 52.51667])
      })
    })

    describe('apollo mapData', () => {
      it('query returns mapQuery', () => {
        const queryFn = wrapper.vm.$options.apollo.mapData.query.bind(wrapper.vm)
        expect(queryFn()).toBeTruthy()
      })

      it('variables returns correct filter', () => {
        const variablesFn = wrapper.vm.$options.apollo.mapData.variables.bind(wrapper.vm)
        const vars = variablesFn()
        expect(vars.userFilter).toEqual({ hasLocation: true })
        expect(vars.groupHasLocation).toBe(true)
        expect(vars.postFilter.postType_in).toEqual(['Event'])
        expect(vars.postFilter.hasLocation).toBe(true)
      })

      it('update sets users, groups, posts and calls addMarkersOnCheckPrepared', () => {
        const spy = jest.spyOn(wrapper.vm, 'addMarkersOnCheckPrepared')
        const updateFn = wrapper.vm.$options.apollo.mapData.update.bind(wrapper.vm)
        updateFn({ User: otherUsers, Group: groups, Post: posts })
        expect(wrapper.vm.users).toBe(otherUsers)
        expect(wrapper.vm.groups).toBe(groups)
        expect(wrapper.vm.posts).toBe(posts)
        expect(spy).toHaveBeenCalled()
      })
    })

    describe('beforeDestroy', () => {
      it('removes resize listener', () => {
        const spy = jest.spyOn(window, 'removeEventListener')
        wrapper.destroy()
        expect(spy).toHaveBeenCalledWith('resize', wrapper.vm.updateMapPosition)
        spy.mockRestore()
      })
    })
  })
})
