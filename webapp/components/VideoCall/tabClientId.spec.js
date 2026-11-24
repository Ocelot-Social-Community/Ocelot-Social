// A fresh module per test: the id is taken when the page loads, which is when the module does.
const KEY = 'videoCall.tabClientId'

// The tabs of the browser, as far as they talk to each other: every page opens one channel.
// Messages go to the other open ones at once; a page in the back/forward cache hears none.
class FakeChannel {
  constructor(name) {
    this.name = name
    this.asleep = false
    FakeChannel.open.push(this)
  }

  postMessage(data) {
    const deliver = () =>
      FakeChannel.open
        .filter((other) => other !== this && other.name === this.name && !other.asleep)
        .forEach((other) => other.onmessage && other.onmessage({ data }))
    // Queued, as a browser does: delivered once the sender has gone on.
    if (FakeChannel.queued) FakeChannel.pending.push(deliver)
    else deliver()
  }

  static flush() {
    while (FakeChannel.pending.length) FakeChannel.pending.shift()()
  }

  close() {
    FakeChannel.open = FakeChannel.open.filter((other) => other !== this)
  }
}
FakeChannel.open = []
FakeChannel.queued = false
FakeChannel.pending = []

// One page: the module as it loads, with the channel it opened.
const load = () => {
  let module
  jest.isolateModules(() => {
    module = require('./tabClientId')
  })
  return { ...module, channel: FakeChannel.open[FakeChannel.open.length - 1] }
}

const leavePage = () => window.dispatchEvent(new Event('pagehide'))
const backFromCache = () => {
  const restored = new Event('pageshow')
  restored.persisted = true
  window.dispatchEvent(restored)
}

describe('tabClientId', () => {
  beforeEach(() => {
    window.sessionStorage.clear()
    FakeChannel.open = []
    FakeChannel.queued = false
    FakeChannel.pending = []
    global.BroadcastChannel = FakeChannel
  })

  afterAll(() => {
    delete global.BroadcastChannel
  })

  it('is the same on every call, and one the server accepts', () => {
    const { tabClientId } = load()

    expect(tabClientId()).toBe(tabClientId())
    expect(tabClientId()).toMatch(/^[A-Za-z0-9_-]{8,64}$/)
  })

  it('is the same after a reload of the tab', () => {
    const page = load()
    const before = page.tabClientId()
    leavePage()
    page.channel.close()

    expect(load().tabClientId()).toBe(before)
  })

  it('is not kept in the tab while the page is open, so a duplicated tab makes its own', () => {
    const original = load().tabClientId()

    // What a duplicated tab starts with: a copy of the storage as it is now.
    expect(window.sessionStorage.getItem(KEY)).toBeNull()
    expect(load().tabClientId()).not.toBe(original)
  })

  it('is its own again when the page comes back from the back/forward cache', () => {
    const page = load()
    const before = page.tabClientId()
    leavePage()
    backFromCache()

    expect(window.sessionStorage.getItem(KEY)).toBeNull()
    expect(page.tabClientId()).toBe(before)
  })

  describe('of a tab duplicated while it shows another site', () => {
    // The original leaves the app (its id put back) and goes into the back/forward cache; the
    // copy starts with that storage and comes to the app with the id.
    const duplicateAway = () => {
      const original = load()
      const id = original.tabClientId()
      leavePage()
      original.channel.asleep = true
      const copy = load()
      return { original, copy, id }
    }

    it('is the copy’s while the original is away', () => {
      const { copy, id } = duplicateAway()

      expect(copy.tabClientId()).toBe(id)
    })

    it('is a new one for the original coming back from the back/forward cache', () => {
      const { original, copy } = duplicateAway()
      original.channel.asleep = false
      backFromCache()

      expect(original.tabClientId()).not.toBe(copy.tabClientId())
      expect(original.tabClientId()).toMatch(/^[A-Za-z0-9_-]{8,64}$/)
    })

    it('is a new one for the original reloaded', () => {
      const { original, copy, id } = duplicateAway()
      // The original's own storage still has the id it put back.
      original.channel.close()
      window.sessionStorage.setItem(KEY, id)
      const reloaded = load()

      expect(reloaded.tabClientId()).not.toBe(copy.tabClientId())
      expect(copy.tabClientId()).toBe(id)
    })
  })

  it('stays when an answer to another tab’s question about it is heard', () => {
    // A is in a call with X; B and C both come with a copy of X and ask at once. Each answer
    // reaches every tab, A included.
    FakeChannel.queued = true
    const a = load()
    FakeChannel.flush()
    const x = a.tabClientId()
    window.sessionStorage.setItem(KEY, x)
    const b = load()
    window.sessionStorage.setItem(KEY, x)
    const c = load()
    FakeChannel.flush()

    expect(a.tabClientId()).toBe(x)
    expect(b.tabClientId()).not.toBe(x)
    expect(c.tabClientId()).not.toBe(x)
    expect(b.tabClientId()).not.toBe(c.tabClientId())
  })

  it('is a new one after a page ended without pagehide, a known limit', () => {
    // A crash or a killed process: nothing is put back, so the reload cannot know its old id.
    const page = load()
    const before = page.tabClientId()
    page.channel.close()

    expect(load().tabClientId()).not.toBe(before)
  })

  it('is made all the same where tabs cannot talk to each other', () => {
    delete global.BroadcastChannel
    const page = load()

    expect(page.channel).toBeUndefined()
    expect(page.tabClientId()).toMatch(/^[A-Za-z0-9_-]{8,64}$/)
  })

  it('is a new one for a stored value the server would not accept', () => {
    window.sessionStorage.setItem(KEY, 'not#valid')

    expect(load().tabClientId()).not.toBe('not#valid')
    expect(load().tabClientId()).toMatch(/^[A-Za-z0-9_-]{8,64}$/)
  })
})
