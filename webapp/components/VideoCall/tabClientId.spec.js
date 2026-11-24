// A fresh module per test: the id is taken when the page loads, which is when the module does.
const KEY = 'videoCall.tabClientId'

const load = () => {
  let module
  jest.isolateModules(() => {
    module = require('./tabClientId')
  })
  return module
}

const leavePage = () => window.dispatchEvent(new Event('pagehide'))

describe('tabClientId', () => {
  beforeEach(() => {
    window.sessionStorage.clear()
  })

  it('is the same on every call, and one the server accepts', () => {
    const { tabClientId } = load()

    expect(tabClientId()).toBe(tabClientId())
    expect(tabClientId()).toMatch(/^[A-Za-z0-9_-]{8,64}$/)
  })

  it('is the same after a reload of the tab', () => {
    const before = load().tabClientId()
    leavePage()

    expect(load().tabClientId()).toBe(before)
  })

  it('is not kept in the tab while the page is open, so a duplicated tab makes its own', () => {
    const original = load().tabClientId()

    // What a duplicated tab starts with: a copy of the storage as it is now.
    expect(window.sessionStorage.getItem(KEY)).toBeNull()
    expect(load().tabClientId()).not.toBe(original)
  })

  it('is its own again when the page comes back from the back/forward cache', () => {
    load().tabClientId()
    leavePage()
    const restored = new Event('pageshow')
    restored.persisted = true
    window.dispatchEvent(restored)

    expect(window.sessionStorage.getItem(KEY)).toBeNull()
  })

  it('is a new one for a stored value the server would not accept', () => {
    window.sessionStorage.setItem(KEY, 'not#valid')

    expect(load().tabClientId()).not.toBe('not#valid')
    expect(load().tabClientId()).toMatch(/^[A-Za-z0-9_-]{8,64}$/)
  })
})
