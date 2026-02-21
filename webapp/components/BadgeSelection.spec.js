import { render, screen, fireEvent, within } from '@testing-library/vue'
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

    describe('with drag enabled', () => {
      let wrapper

      beforeEach(() => {
        wrapper = Wrapper({ badges, dragEnabled: true })
      })

      it('items are draggable', () => {
        const items = wrapper.container.querySelectorAll('.badge-selection-item')
        items.forEach((item) => {
          expect(item.getAttribute('draggable')).toBe('true')
        })
      })

      describe('dragstart on an item', () => {
        it('sets dataTransfer data', async () => {
          const item = within(wrapper.container).getByText(badges[0].description).closest('.badge-selection-item')
          const setData = jest.fn()
          await fireEvent.dragStart(item, {
            dataTransfer: { setData, effectAllowed: '' },
          })
          expect(setData).toHaveBeenCalledWith(
            'application/json',
            JSON.stringify({ source: 'reserve', badge: badges[0] }),
          )
        })
      })

      describe('drop on container with hex badge data', () => {
        it('emits badge-returned', async () => {
          const container = wrapper.container.querySelector('.badge-selection')
          const hexData = JSON.stringify({ source: 'hex', index: 2, badge: { id: '10' } })
          await fireEvent.drop(container, {
            dataTransfer: { getData: () => hexData },
          })
          expect(wrapper.emitted()['badge-returned']).toBeTruthy()
          expect(wrapper.emitted()['badge-returned'][0][0]).toEqual({
            source: 'hex',
            index: 2,
            badge: { id: '10' },
          })
        })
      })

      describe('drop on container with reserve badge data', () => {
        it('does not emit badge-returned', async () => {
          const container = wrapper.container.querySelector('.badge-selection')
          const reserveData = JSON.stringify({ source: 'reserve', badge: badges[0] })
          await fireEvent.drop(container, {
            dataTransfer: { getData: () => reserveData },
          })
          expect(wrapper.emitted()['badge-returned']).toBeFalsy()
        })
      })
    })

    describe('with drag disabled', () => {
      let wrapper

      beforeEach(() => {
        wrapper = Wrapper({ badges, dragEnabled: false })
      })

      it('items are not draggable', () => {
        const items = wrapper.container.querySelectorAll('.badge-selection-item')
        items.forEach((item) => {
          expect(item.getAttribute('draggable')).toBe('false')
        })
      })
    })
  })
})
