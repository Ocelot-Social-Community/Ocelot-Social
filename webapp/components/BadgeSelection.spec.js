import { render, screen, fireEvent } from '@testing-library/vue'
import BadgeSelection from './BadgeSelection.vue'

const localVue = global.localVue

describe('Badges.vue', () => {
  const Wrapper = (propsData) => {
    return render(BadgeSelection, {
      propsData,
      localVue,
    })
  }

  describe('without badges', () => {
    it('renders', () => {
      const wrapper = Wrapper({ badges: [] })
      expect(wrapper.container).toMatchSnapshot()
    })
  })

  describe('with badges', () => {
    const badges = [
      {
        id: '1',
        icon: '/path/to/some/icon',
        isDefault: false,
        description: 'Some description',
      },
      {
        id: '2',
        icon: '/path/to/another/icon',
        isDefault: true,
        description: 'Another description',
      },
      {
        id: '3',
        icon: '/path/to/third/icon',
        isDefault: false,
        description: 'Third description',
      },
    ]

    let wrapper

    beforeEach(() => {
      wrapper = Wrapper({ badges })
    })

    it('renders', () => {
      expect(wrapper.container).toMatchSnapshot()
    })

    describe('clicking on a badge', () => {
      beforeEach(async () => {
        const badge = screen.getByText(badges[1].description)
        await fireEvent.click(badge)
      })

      it('emits badge-selected with badge', async () => {
        expect(wrapper.emitted()['badge-selected']).toEqual([[badges[1]]])
      })
    })

    describe('clicking twice on a badge', () => {
      beforeEach(async () => {
        const badge = screen.getByText(badges[1].description)
        await fireEvent.click(badge)
        await fireEvent.click(badge)
      })

      it('emits badge-selected with null', async () => {
        expect(wrapper.emitted()['badge-selected']).toEqual([[badges[1]], [null]])
      })
    })
  })
})
