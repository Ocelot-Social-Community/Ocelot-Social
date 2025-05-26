import { render, fireEvent, screen } from '@testing-library/vue'
import BadgesSection from './BadgesSection.vue'

const localVue = global.localVue

const badge1 = {
  id: 'badge1',
  icon: '/icon1',
  type: 'type1',
  description: 'description1',
  isActive: true,
}
const badge2 = {
  id: 'badge2',
  icon: '/icon2',
  type: 'type1',
  description: 'description2',
  isActive: false,
}

describe('Admin/BadgesSection', () => {
  let wrapper

  const Wrapper = (withBadges = true) => {
    return render(BadgesSection, {
      localVue,
      propsData: {
        badges: withBadges ? [badge1, badge2] : [],
      },
      mocks: {
        $t: jest.fn((t) => t),
      },
    })
  }

  describe('without badges', () => {
    beforeEach(() => {
      wrapper = Wrapper(false)
    })

    it('renders', () => {
      expect(wrapper.baseElement).toMatchSnapshot()
    })
  })

  describe('with badges', () => {
    beforeEach(() => {
      wrapper = Wrapper(true)
    })

    it('renders', () => {
      expect(wrapper.baseElement).toMatchSnapshot()
    })

    it('emits toggleButton', async () => {
      const button = screen.getByAltText(badge1.description)
      await fireEvent.click(button)
      expect(wrapper.emitted().toggleBadge[0][0]).toEqual(badge1)
    })
  })
})
