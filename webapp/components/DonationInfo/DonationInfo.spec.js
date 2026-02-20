import { mount } from '@vue/test-utils'

import DonationInfo from './DonationInfo.vue'

const localVue = global.localVue

const OriginalDate = global.Date
const mockDate = new OriginalDate(2019, 11, 6)

describe('DonationInfo.vue', () => {
  beforeAll(() => {
    global.Date = jest.fn(() => mockDate)
  })

  afterAll(() => {
    global.Date = OriginalDate
  })

  let mocks, wrapper, propsData

  beforeEach(() => {
    mocks = {
      $t: jest.fn((string) => string),
      $i18n: {
        locale: () => 'en',
      },
    }
    propsData = {
      goal: 50000,
      progress: 10000,
    }
  })

  const Wrapper = () => mount(DonationInfo, { mocks, localVue, propsData })

  describe('mount', () => {
    beforeEach(() => {
      wrapper = Wrapper()
    })

    it('displays the progress bar', () => {
      expect(wrapper.find('.progress-bar').exists()).toBe(true)
    })

    it('displays the action button', () => {
      expect(wrapper.find('button').text()).toBe('donations.donate-now')
    })

    describe('mount with data', () => {
      describe('given german locale', () => {
        let toLocaleStringSpy

        beforeEach(() => {
          mocks.$i18n.locale = () => 'de'
          const originalToLocaleString = Number.prototype.toLocaleString
          toLocaleStringSpy = jest.spyOn(Number.prototype, 'toLocaleString')
          toLocaleStringSpy.mockImplementation(function (locale) {
            if (locale === 'de')
              return this.valueOf()
                .toString()
                .replace(/\B(?=(\d{3})+(?!\d))/g, '.')
            return originalToLocaleString.call(this, locale)
          })
        })

        afterEach(() => {
          toLocaleStringSpy.mockRestore()
        })

        it('creates a label from the given amounts and a translation string', () => {
          wrapper = Wrapper()
          expect(mocks.$t).toHaveBeenCalledWith('donations.amount-of-total', {
            amount: '10.000',
            total: '50.000',
          })
        })
      })

      describe('given english locale', () => {
        beforeEach(() => {
          mocks.$i18n.locale = () => 'en'
        })

        it('creates a label from the given amounts and a translation string', () => {
          expect(mocks.$t).toHaveBeenCalledWith(
            'donations.amount-of-total',
            expect.objectContaining({
              amount: '10,000',
              total: '50,000',
            }),
          )
        })
      })
    })
  })
})
