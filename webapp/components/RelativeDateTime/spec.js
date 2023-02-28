import { shallowMount } from '@vue/test-utils'
import RelativeDateTime from './'

const localVue = global.localVue

describe('RelativeDateTime', () => {
  let mocks
  let locale
  let dateTime

  beforeEach(() => {
    mocks = {
      $i18n: {
        locale: () => locale,
      },
    }
  })

  const Wrapper = () => {
    return shallowMount(RelativeDateTime, {
      mocks,
      localVue,
      propsData: {
        dateTime,
      },
    })
  }

  describe('given a String as dateTime', () => {
    beforeEach(() => {
      dateTime = '08.03.2017'
    })

    it('translates', () => {
      expect(Wrapper().text()).toContain('08/03/2017')
    })
  })

  describe('given a Date object as dateTime', () => {
    beforeEach(() => {
      dateTime = new Date()
    })

    it('renders', () => {
      expect(Wrapper().element.tagName).toBe('SPAN')
    })

    describe("locale == 'en'", () => {
      beforeEach(() => {
        locale = 'en'
      })

      it('translates', () => {
        expect(Wrapper().text()).toContain('today at')
      })
    })

    describe("locale == 'gibberish'", () => {
      beforeEach(() => {
        locale = 'gibberish'
      })

      it('translates', () => {
        expect(Wrapper().text()).toContain('today at')
      })
    })

    describe("locale == 'de'", () => {
      beforeEach(() => {
        locale = 'de'
      })

      it('translates', () => {
        expect(Wrapper().text()).toContain('heute um')
      })
    })
  })
})
