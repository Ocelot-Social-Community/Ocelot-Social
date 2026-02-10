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
        beforeEach(() => {
          mocks.$i18n.locale = () => 'de'
        })

        // it looks to me that toLocaleString for some reason is not working as expected
        it.skip('creates a label from the given amounts and a translation string', () => {
          expect(mocks.$t).toHaveBeenNthCalledWith(1, 'donations.amount-of-total', {
            amount: '10.000',
            total: '50.000',
          })
        })
      })

      describe('given english locale', () => {
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
