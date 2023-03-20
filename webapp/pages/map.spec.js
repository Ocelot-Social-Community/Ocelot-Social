// eslint-disable-next-line no-unused-vars
import mapboxgl from 'mapbox-gl'
import { mount } from '@vue/test-utils'
import VueMeta from 'vue-meta'
import Vuex from 'vuex'
import Map from './map'
import MapboxGeocoder from '@mapbox/mapbox-gl-geocoder'

jest.mock('@mapbox/mapbox-gl-geocoder', () => {
  return jest.fn().mockImplementation(jest.fn())
})

jest.mock('mapbox-gl', () => {
  return {
    GeolocateControl: jest.fn(),
    Map: jest.fn(() => ({
      addControl: jest.fn(),
      on: jest.fn(),
      remove: jest.fn(),
    })),
    NavigationControl: jest.fn(),
    Popup: jest.fn(() => {
      return {
        isOpen: jest.fn(),
        setLngLat: jest.fn(() => {
          return {
            setHTML: jest.fn(() => {
              return {
                addTo: jest.fn(),
              }
            }),
          }
        }),
      }
    }),
  }
})

const localVue = global.localVue
localVue.use(VueMeta, { keyName: 'head' })

const onEventMocks = {}

const mapOnMock = jest.fn((key, ...args) => {
  onEventMocks[key] = args[args.length - 1]
})
const mapAddControlMock = jest.fn()

const mapMock = {
  on: mapOnMock,
  addControl: mapAddControlMock,
  loadImage: jest.fn(),
  getCanvas: jest.fn(() => {
    return {
      style: {
        cursor: 'pointer',
      },
    }
  }),
}

const stubs = {
  'client-only': true,
  'mgl-map': true,
  MglFullscreenControl: true,
  MglNavigationControl: true,
  MglGeolocateControl: true,
  MglScaleControl: true,
}

describe('map', () => {
  let wrapper
  let mocks

  beforeEach(() => {
    MapboxGeocoder.mockClear()
    mocks = {
      $t: (t) => t,
      $env: {
        MAPBOX_TOKEN: 'MY_MAPBOX_TOKEN',
      },
      $toast: {
        error: jest.fn(),
      },
    }
  })

  describe('mount', () => {
    const Wrapper = () => {
      const store = new Vuex.Store({ getters: { 'auth/user': () => false } })
      return mount(Map, {
        mocks,
        localVue,
        stubs,
        store,
      })
    }

    beforeEach(() => {
      wrapper = Wrapper()
    })

    it('renders', () => {
      expect(wrapper.element.tagName).toBe('DIV')
    })

    it('has correct <head> content', () => {
      expect(wrapper.vm.$metaInfo.title).toBe('map.pageTitle')
    })

    describe('trigger map load', () => {
      beforeEach(async () => {
        await wrapper.find('mgl-map-stub').vm.$emit('load', { map: mapMock })
      })

      it('initializes on style load', () => {
        expect(mapOnMock).toBeCalledWith('style.load', expect.any(Function))
      })

      it('initializes on mouseenter', () => {
        expect(mapOnMock).toBeCalledWith('mouseenter', 'markers', expect.any(Function))
      })

      it('initializes on mouseleave', () => {
        expect(mapOnMock).toBeCalledWith('mouseleave', 'markers', expect.any(Function))
      })

      it('calls add map control', () => {
        expect(mapAddControlMock).toBeCalled()
      })

      describe('trigger style load event', () => {
        let spy
        beforeEach(() => {
          spy = jest.spyOn(wrapper.vm, 'loadMarkersIconsAndAddMarkers')
          onEventMocks['style.load']()
        })

        it('calls loadMarkersIconsAndAddMarkers', () => {
          expect(spy).toBeCalled()
        })
      })

      describe('trigger mouse enter event', () => {
        beforeEach(() => {
          onEventMocks.mouseenter({
            features: [
              {
                geometry: {
                  coordinates: [100, 200],
                },
                properties: {
                  type: 'user',
                },
              },
            ],
            lngLat: {
              lng: 100,
              lat: 200,
            },
          })
        })

        it('works without errors and warnings', () => {
          expect(true).toBe(true)
        })
      })
    })
  })
})
