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
  $env: {
    REQUIRE_LOCATION: false,
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

    it('renders the label', () => {
      expect(wrapper.find('label.ds-input-label').exists()).toBe(true)
    })

    it('renders the select', () => {
      expect(wrapper.find('.ds-select').exists()).toBe(true)
    })

    it('renders the clearLocationName button', () => {
      expect(wrapper.find('.base-button').exists()).toBe(true)
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
        wrapper.find('.base-button').trigger('click')
      })

      it('emits an empty string', () => {
        expect(wrapper.emitted().input).toBeTruthy()
        expect(wrapper.emitted().input.length).toBe(1)
        expect(wrapper.emitted().input[0]).toEqual([''])
      })
    })

    describe('require location  is true', () => {
      beforeEach(() => {
        mocks.$env.REQUIRE_LOCATION = true
        wrapper = Wrapper()
      })

      it('does not show clear location name button', () => {
        expect(wrapper.find('.base-button').exists()).toBe(false)
      })
    })
  })
})
