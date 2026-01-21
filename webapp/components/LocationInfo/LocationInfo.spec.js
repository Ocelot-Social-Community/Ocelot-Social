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
})
