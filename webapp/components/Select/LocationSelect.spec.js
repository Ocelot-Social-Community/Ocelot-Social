import { mount } from '@vue/test-utils'
import LocationSelect from './LocationSelect'
import { queryLocations } from '~/graphql/location'

const localVue = global.localVue
const propsData = { value: 'nowhere' }

let wrapper

const queryMock = jest.fn().mockResolvedValue({
  data: {
    queryLocations: [
      {
        place_name: 'Hamburg, Germany',
        place_id: 'xxx',
      },
    ],
  },
})

const mocks = {
  $t: jest.fn((string) => string),
  $i18n: {
    locale: () => 'en',
  },
  $apollo: {
    query: queryMock,
  },
}

describe('LocationSelect', () => {
  beforeEach(() => {})

  describe('mount', () => {
    const Wrapper = () => {
      return mount(LocationSelect, { mocks, localVue, propsData })
    }

    beforeEach(() => {
      wrapper = Wrapper()
    })

    it('renders the label with previous location by default', () => {
      expect(wrapper.find('label.ds-input-label').text()).toBe('settings.data.labelCity — nowhere')
    })

    it('renders the select', () => {
      expect(wrapper.find('.ds-select').exists()).toBe(true)
    })

    it('renders the clearLocationName button by default', () => {
      expect(wrapper.find('button').exists()).toBe(true)
    })

    it('calls apollo with given value', () => {
      expect(queryMock).toBeCalledWith({
        query: queryLocations(),
        variables: {
          place: 'nowhere',
          lang: 'en',
        },
      })
    })

    describe('clearLocationName button click', () => {
      beforeEach(() => {
        wrapper.find('button').trigger('click')
      })

      it('emits an empty string', () => {
        expect(wrapper.emitted().input).toBeTruthy()
        expect(wrapper.emitted().input.length).toBe(1)
        expect(wrapper.emitted().input[0]).toEqual([''])
      })
    })

    describe('canBeCleared is false', () => {
      beforeEach(() => {
        propsData.canBeCleared = false
        wrapper = Wrapper()
      })

      it('does not show clear location name button', () => {
        expect(wrapper.find('button').exists()).toBe(false)
      })
    })

    describe('showPreviousLocation is false', () => {
      beforeEach(() => {
        propsData.showPreviousLocation = false
        wrapper = Wrapper()
      })

      it('does not show the previous location', () => {
        expect(wrapper.find('.ds-input-label').text()).toBe('settings.data.labelCity')
      })
    })
  })
})
