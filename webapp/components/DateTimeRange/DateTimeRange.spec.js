import { createLocalVue } from '@vue/test-utils'
import { renderAndHydrate, setTimeZone } from '~/test/hydration'
import DateTimeRange from './DateTimeRange.vue'

let locale = 'de'
const LocalVue = createLocalVue()
LocalVue.prototype.$i18n = { locale: () => locale }

describe('DateTimeRange', () => {
  afterEach(() => {
    locale = 'de'
    setTimeZone(undefined)
    document.body.innerHTML = ''
  })

  // 23:30–00:30 in Berlin, but 22:30–23:30 on the same day on a server running in UTC.
  const eventAcrossMidnightInBerlin = {
    startDate: '2026-01-01T22:30:00.000Z',
    endDate: '2026-01-01T23:30:00.000Z',
  }

  const hydrate = (props, { serverTimeZone, clientTimeZone }) =>
    renderAndHydrate(
      { render: (h) => h(DateTimeRange, { props }) },
      {
        LocalVue,
        server: () => setTimeZone(serverTimeZone),
        client: () => setTimeZone(clientTimeZone),
      },
    )

  // The text a user sees, i.e. without the parts hidden by `display: none`.
  const visibleText = (vm) => {
    const texts = []
    const walker = document.createTreeWalker(vm.$el, NodeFilter.SHOW_TEXT)
    while (walker.nextNode()) {
      const text = walker.currentNode.textContent.trim()
      // The server writes `display:none`, the client patches in `display: none`.
      const hidden = walker.currentNode.parentElement.closest(
        '[style*="display:none"], [style*="display: none"]',
      )
      if (text && !hidden) {
        texts.push(text)
      }
    }
    return texts
  }

  describe('hydrating an event that ends on the next day only in the time zone of the browser', () => {
    it('matches the markup of the server', async () => {
      const { warnings } = await hydrate(eventAcrossMidnightInBerlin, {
        serverTimeZone: 'UTC',
        clientTimeZone: 'Europe/Berlin',
      })
      expect(warnings).toEqual([])
    })

    it('shows start and end on their own days', async () => {
      const { vm } = await hydrate(eventAcrossMidnightInBerlin, {
        serverTimeZone: 'UTC',
        clientTimeZone: 'Europe/Berlin',
      })
      expect(visibleText(vm)).toEqual(['01.01.2026', '23:30', '02.01.2026', '00:30'])
    })
  })

  describe('hydrating an event that ends on the same day only in the time zone of the browser', () => {
    it('matches the markup of the server', async () => {
      const { warnings } = await hydrate(eventAcrossMidnightInBerlin, {
        serverTimeZone: 'Europe/Berlin',
        clientTimeZone: 'UTC',
      })
      expect(warnings).toEqual([])
    })

    it('shows the time span on one day', async () => {
      const { vm } = await hydrate(eventAcrossMidnightInBerlin, {
        serverTimeZone: 'Europe/Berlin',
        clientTimeZone: 'UTC',
      })
      expect(visibleText(vm)).toEqual(['01.01.2026', '22:30–23:30 Uhr'])
    })
  })

  describe('without an end date', () => {
    it('shows the start only', async () => {
      const { vm, warnings } = await hydrate(
        { startDate: eventAcrossMidnightInBerlin.startDate },
        { serverTimeZone: 'UTC', clientTimeZone: 'UTC' },
      )
      expect(warnings).toEqual([])
      expect(visibleText(vm)).toEqual(['01.01.2026', '22:30'])
    })
  })

  describe('in the locale of the user', () => {
    it('writes date, time and span the way the locale does', async () => {
      locale = 'en'
      const { vm } = await hydrate(eventAcrossMidnightInBerlin, {
        serverTimeZone: 'UTC',
        clientTimeZone: 'UTC',
      })
      expect(visibleText(vm).map((text) => text.replace(/[\u2009\u202f]/g, ' '))).toEqual([
        '01/01/2026',
        '10:30 – 11:30 PM',
      ])
    })
  })
})
