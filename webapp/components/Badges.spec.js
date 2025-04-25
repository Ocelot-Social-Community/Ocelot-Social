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
  })
})
