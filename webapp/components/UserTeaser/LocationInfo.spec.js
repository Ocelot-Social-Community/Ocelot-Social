import { render } from '@testing-library/vue'
import LocationInfo from './LocationInfo.vue'

const localVue = global.localVue

describe('LocationInfo', () => {
  const Wrapper = ({ withDistance }) => {
    return render(LocationInfo, {
      localVue,
      propsData: {
        locationData: {
          name: 'Paris',
          distanceToMe: withDistance ? 100 : null,
        },
      },
      mocks: {
        $t: jest.fn((t) => t),
      },
    })
  }

  it('renders with distance', () => {
    const wrapper = Wrapper({ withDistance: true })
    expect(wrapper.container).toMatchSnapshot()
  })

  it('renders without distance', () => {
    const wrapper = Wrapper({ withDistance: false })
    expect(wrapper.container).toMatchSnapshot()
  })
})
