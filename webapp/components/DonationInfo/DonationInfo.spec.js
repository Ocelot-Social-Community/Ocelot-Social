import { mount } from '@vue/test-utils'

import DonationInfo from './DonationInfo.vue'

const localVue = global.localVue

const mockDate = new Date(2019, 11, 6)
global.Date = jest.fn(() => mockDate)

describe('DonationInfo.vue', () => {
  let mocks, wrapper

  beforeEach(() => {
    mocks = {
      $t: jest.fn((string) => string),
      $i18n: {
        locale: () => 'de',
      },
    }
  })

  const Wrapper = () => mount(DonationInfo, { mocks, localVue })

  it('displays a call to action button', () => {
    expect(Wrapper().find('.base-button').text()).toBe('donations.donate-now')
  })

  it.skip('creates a title from the current month and a translation string', () => {
    mocks.$t = jest.fn(() => 'Spenden für')
    expect(Wrapper().vm.title).toBe('Spenden für Dezember')
  })

  describe('mount with data', () => {
    beforeEach(() => {
      wrapper = Wrapper()
      wrapper.setData({ goal: 50000, progress: 10000 })
    })

    describe('given german locale', () => {
      it.skip('creates a label from the given amounts and a translation string', () => {
        expect(mocks.$t).toBeCalledWith(
          'donations.amount-of-total',
          expect.objectContaining({
            amount: '10.000',
            total: '50.000',
          }),
        )
      })
    })

    describe('given english locale', () => {
      beforeEach(() => {
        mocks.$i18n.locale = () => 'en'
      })

      it.skip('creates a label from the given amounts and a translation string', () => {
        expect(mocks.$t).toBeCalledWith(
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
