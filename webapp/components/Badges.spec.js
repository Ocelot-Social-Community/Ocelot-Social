import { render, screen, fireEvent } from '@testing-library/vue'
import Badges from './Badges.vue'

const localVue = global.localVue

describe('Badges.vue', () => {
  const Wrapper = (propsData) => {
    return render(Badges, {
      propsData,
      localVue,
    })
  }

  describe('without badges', () => {
    it('renders in presentation mode', () => {
      const wrapper = Wrapper({ badges: [], selectionMode: false })
      expect(wrapper.container).toMatchSnapshot()
    })

    it('renders in selection mode', () => {
      const wrapper = Wrapper({ badges: [], selectionMode: true })
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

    describe('in presentation mode', () => {
      let wrapper

      beforeEach(() => {
        wrapper = Wrapper({ badges, scale: 1.2, selectionMode: false })
      })

      it('renders', () => {
        expect(wrapper.container).toMatchSnapshot()
      })

      it('clicking on second badge does nothing', async () => {
        const badge = screen.getByTitle(badges[1].description)
        await fireEvent.click(badge)
        expect(wrapper.emitted()).toEqual({})
      })
    })

    describe('in selection mode', () => {
      let wrapper

      beforeEach(() => {
        wrapper = Wrapper({ badges, scale: 1.2, selectionMode: true })
      })

      it('renders', () => {
        expect(wrapper.container).toMatchSnapshot()
      })

      it('clicking on first badge does nothing', async () => {
        const badge = screen.getByTitle(badges[0].description)
        await fireEvent.click(badge)
        expect(wrapper.emitted()).toEqual({})
      })

      describe('clicking on second badge', () => {
        beforeEach(async () => {
          const badge = screen.getByTitle(badges[1].description)
          await fireEvent.click(badge)
        })

        it('selects badge', () => {
          expect(wrapper.container).toMatchSnapshot()
        })

        it('emits badge-selected with index', async () => {
          expect(wrapper.emitted()['badge-selected']).toEqual([[1]])
        })
      })

      describe('clicking twice on second badge', () => {
        beforeEach(async () => {
          const badge = screen.getByTitle(badges[1].description)
          await fireEvent.click(badge)
          await fireEvent.click(badge)
        })

        it('deselects badge', () => {
          expect(wrapper.container).toMatchSnapshot()
        })

        it('emits badge-selected with null', async () => {
          expect(wrapper.emitted()['badge-selected']).toEqual([[1], [null]])
        })
      })
    })

    describe('with drag enabled', () => {
      let wrapper

      beforeEach(() => {
        wrapper = Wrapper({ badges, selectionMode: true, dragEnabled: true })
      })

      it('renders draggable badges except first and default ones', () => {
        const containers = wrapper.container.querySelectorAll('.hc-badge-container')
        expect(containers[0].getAttribute('draggable')).toBe('false')
        expect(containers[1].getAttribute('draggable')).toBe('false') // isDefault: true
        expect(containers[2].getAttribute('draggable')).toBe('true')
      })

      it('first badge (index 0) is never draggable', () => {
        const firstBadge = wrapper.container.querySelector('.hc-badge-container')
        expect(firstBadge.getAttribute('draggable')).toBe('false')
      })

      describe('dragstart on non-default badge', () => {
        it('emits drag-start with badge data', async () => {
          const badge = screen.getByTitle(badges[2].description)
          const container = badge.closest('.hc-badge-container')
          await fireEvent.dragStart(container, {
            dataTransfer: {
              setData: jest.fn(),
              effectAllowed: '',
            },
          })
          expect(wrapper.emitted()['drag-start']).toBeTruthy()
          expect(wrapper.emitted()['drag-start'][0][0]).toEqual({
            source: 'hex',
            index: 2,
            badge: badges[2],
          })
        })
      })

      describe('drop on a slot', () => {
        it('emits badge-drop with parsed source and target data', async () => {
          const targetBadge = screen.getByTitle(badges[2].description)
          const container = targetBadge.closest('.hc-badge-container')
          const sourceData = JSON.stringify({ source: 'reserve', badge: { id: '99', icon: '/x' } })
          await fireEvent.drop(container, {
            dataTransfer: {
              getData: () => sourceData,
            },
          })
          expect(wrapper.emitted()['badge-drop']).toBeTruthy()
          const emitted = wrapper.emitted()['badge-drop'][0][0]
          expect(emitted.targetIndex).toBe(2)
          expect(emitted.targetBadge).toEqual(badges[2])
          expect(emitted.source).toEqual({ source: 'reserve', badge: { id: '99', icon: '/x' } })
        })

        it('does not emit badge-drop when dropping on index 0', async () => {
          const firstBadge = screen.getByTitle(badges[0].description)
          const container = firstBadge.closest('.hc-badge-container')
          await fireEvent.drop(container, {
            dataTransfer: {
              getData: () => '{}',
            },
          })
          expect(wrapper.emitted()['badge-drop']).toBeFalsy()
        })
      })

      describe('dragend', () => {
        it('emits drag-end', async () => {
          const badge = screen.getByTitle(badges[2].description)
          const container = badge.closest('.hc-badge-container')
          await fireEvent.dragEnd(container)
          expect(wrapper.emitted()['drag-end']).toBeTruthy()
        })
      })
    })

    describe('with drag disabled', () => {
      let wrapper

      beforeEach(() => {
        wrapper = Wrapper({ badges, selectionMode: true, dragEnabled: false })
      })

      it('no badges are draggable', () => {
        const containers = wrapper.container.querySelectorAll('.hc-badge-container')
        containers.forEach((container) => {
          expect(container.getAttribute('draggable')).toBe('false')
        })
      })
    })
  })
})
