import { shallowMount } from '@vue/test-utils'
import DateTime from '.'

const mockDateTime = { relativeDateTime: true, dateStyle: 'medium', timeStyle: null }
jest.mock('@ocelot-social/branding', () => ({
  // A getter: the factory runs before `mockDateTime` is initialized.
  branding: {
    get dateTime() {
      return mockDateTime
    },
  },
}))

const localVue = global.localVue

// Intl separates with narrow no-break spaces ("9:30 PM").
const plain = (text) => text.replace(/[\u00a0\u202f]/g, ' ')

describe('DateTime', () => {
  let locale
  let dateTime

  const Wrapper = () =>
    shallowMount(DateTime, {
      mocks: { $i18n: { locale: () => locale } },
      localVue,
      propsData: { dateTime },
    })

  beforeEach(() => {
    mockDateTime.relativeDateTime = true
    locale = 'en'
  })

  it('renders a span', () => {
    dateTime = new Date()
    expect(Wrapper().element.tagName).toBe('SPAN')
  })

  describe('relative, by default', () => {
    beforeEach(() => {
      dateTime = new Date()
      dateTime.setHours(9, 30)
    })

    it.each([
      ['en', 'today, 9:30 AM'],
      ['de', 'heute, 09:30'],
      ['fr', 'aujourd’hui, 09:30'],
      ['gibberish', 'today, 9:30 AM'],
    ])("writes it in the locale '%s'", (code, expected) => {
      locale = code
      expect(plain(Wrapper().text())).toBe(expected)
    })

    it('takes a date string as well', () => {
      dateTime = dateTime.toISOString()
      expect(plain(Wrapper().text())).toBe('today, 9:30 AM')
    })
  })

  describe('absolute, when the branding turns relative off', () => {
    beforeEach(() => {
      mockDateTime.relativeDateTime = false
      dateTime = new Date(2017, 2, 8, 21, 30)
    })

    it("writes it in the branding's dateStyle", () => {
      locale = 'de'
      expect(Wrapper().text()).toBe('08.03.2017')
    })

    it("adds the branding's timeStyle", () => {
      mockDateTime.timeStyle = 'short'
      expect(plain(Wrapper().text())).toBe('Mar 8, 2017, 9:30 PM')
      mockDateTime.timeStyle = null
    })
  })
})
