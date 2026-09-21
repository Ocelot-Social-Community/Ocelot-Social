import { render } from '@testing-library/vue'
import LocationInfo from './LocationInfo.vue'

const localVue = global.localVue

describe('LocationInfo', () => {
  const Wrapper = ({ withDistance, size = 'base', isOwner = false }) => {
    return render(LocationInfo, {
      localVue,
      propsData: {
        locationData: {
          name: 'Paris',
          distanceToMe: withDistance ? 100 : null,
        },
        size,
        isOwner,
      },
      mocks: {
        $t: jest.fn((t) => t),
      },
    })
  }

  describe('distance', () => {
    it('renders with distance', () => {
      const wrapper = Wrapper({ withDistance: true })
      expect(wrapper.container).toMatchSnapshot()
    })

    it('renders without distance', () => {
      const wrapper = Wrapper({ withDistance: false })
      expect(wrapper.container).toMatchSnapshot()
    })
  })

  describe('size', () => {
    it('renders in base size', () => {
      const wrapper = Wrapper({ withDistance: false, size: 'base' })
      expect(wrapper.container).toMatchSnapshot()
    })

    it('renders in small size', () => {
      const wrapper = Wrapper({ withDistance: false, size: 'small' })
      expect(wrapper.container).toMatchSnapshot()
    })
  })

  describe('fullLocationName', () => {
    // "Paris" alone doesn't say which one — France, or one of the several
    // US towns of the same name — same reasoning LocationSelect's own
    // search results (Mapbox's place_name) already show while editing.
    it('joins the queried parent chain into a full, unambiguous name', () => {
      const wrapper = render(LocationInfo, {
        localVue,
        propsData: {
          locationData: {
            name: 'Paris',
            distanceToMe: null,
            parent: { name: 'France' },
          },
          isOwner: false,
        },
        mocks: { $t: jest.fn((t) => t) },
      })

      expect(wrapper.getByText('Paris, France')).toBeTruthy()
    })

    it('walks more than one parent level', () => {
      const wrapper = render(LocationInfo, {
        localVue,
        propsData: {
          locationData: {
            name: 'Paris',
            distanceToMe: null,
            parent: { name: 'Île-de-France', parent: { name: 'France' } },
          },
          isOwner: false,
        },
        mocks: { $t: jest.fn((t) => t) },
      })

      expect(wrapper.getByText('Paris, Île-de-France, France')).toBeTruthy()
    })

    it('falls back to the bare name when no parent was fetched', () => {
      const wrapper = Wrapper({ withDistance: false })
      expect(wrapper.getByText('Paris')).toBeTruthy()
    })
  })
})
