import Vuex from 'vuex'
import { createLocalVue } from '@vue/test-utils'

import * as videoCall from '~/store/videoCall'
import { reloadPage } from '~/utils/reloadPage'

import { callInProgress, cancelPendingReload, reloadWhenIdle } from './reloadWhenIdle'

// See utils/reloadPage.js: the reload is asserted through its module seam.
jest.mock('~/utils/reloadPage', () => ({ reloadPage: jest.fn() }))

const localVue = createLocalVue()
localVue.use(Vuex)

const buildStore = (phase = 'idle') => {
  const store = new Vuex.Store({ modules: { videoCall: { namespaced: true, ...videoCall } } })
  store.commit('videoCall/SET_PHASE', phase)
  return store
}

const tick = () => localVue.nextTick()

describe('reloadWhenIdle', () => {
  beforeEach(() => {
    reloadPage.mockClear()
  })

  it('reloads at once when no call runs, after the hook', () => {
    const store = buildStore('idle')
    const order = []
    reloadPage.mockImplementationOnce(() => order.push('reload'))

    const deferred = reloadWhenIdle(store, { beforeReload: () => order.push('hook') })

    expect(deferred).toBe(false)
    expect(order).toEqual(['hook', 'reload'])
    expect(store.getters['videoCall/reloadPending']).toBe(false)
  })

  it.each(['connecting', 'in-call'])('waits while the call is %s, and says so', (phase) => {
    const store = buildStore(phase)
    const beforeReload = jest.fn()

    const deferred = reloadWhenIdle(store, { beforeReload })

    expect(deferred).toBe(true)
    expect(reloadPage).not.toHaveBeenCalled()
    // The hook records the reload that happens; nothing has happened yet.
    expect(beforeReload).not.toHaveBeenCalled()
    expect(store.getters['videoCall/reloadPending']).toBe(true)
  })

  it.each(['prejoin', 'error'])('does not wait for a call that is only %s', (phase) => {
    const store = buildStore(phase)

    expect(reloadWhenIdle(store)).toBe(false)
    expect(reloadPage).toHaveBeenCalledTimes(1)
  })

  it('reloads once the call has ended, running the hook then', async () => {
    const store = buildStore('in-call')
    const beforeReload = jest.fn()
    reloadWhenIdle(store, { beforeReload })

    store.commit('videoCall/CLOSE')
    await tick()

    expect(beforeReload).toHaveBeenCalledTimes(1)
    expect(reloadPage).toHaveBeenCalledTimes(1)
    expect(store.getters['videoCall/reloadPending']).toBe(false)
  })

  it('keeps waiting while the call only moves between its phases', async () => {
    const store = buildStore('connecting')
    reloadWhenIdle(store)

    store.commit('videoCall/SET_PHASE', 'in-call')
    await tick()

    expect(reloadPage).not.toHaveBeenCalled()
  })

  it('reloads once for several requests during one call, with the latest hook', async () => {
    const store = buildStore('in-call')
    const first = jest.fn()
    const latest = jest.fn()
    reloadWhenIdle(store, { beforeReload: first })
    reloadWhenIdle(store, { beforeReload: latest })
    // A request without a hook (the admin page's own) keeps the hook that was there.
    reloadWhenIdle(store)

    store.commit('videoCall/SET_PHASE', 'idle')
    await tick()

    expect(first).not.toHaveBeenCalled()
    expect(latest).toHaveBeenCalledTimes(1)
    expect(reloadPage).toHaveBeenCalledTimes(1)
  })

  it('drops a waiting reload when it is cancelled', async () => {
    const store = buildStore('in-call')
    reloadWhenIdle(store)

    cancelPendingReload(store)
    store.commit('videoCall/SET_PHASE', 'idle')
    await tick()

    expect(reloadPage).not.toHaveBeenCalled()
    expect(store.getters['videoCall/reloadPending']).toBe(false)
  })

  it('cancels nothing when nothing waits', () => {
    const store = buildStore('in-call')

    cancelPendingReload(store)

    expect(store.getters['videoCall/reloadPending']).toBe(false)
  })

  it('tells whether a call is in progress', () => {
    expect(callInProgress(buildStore('in-call'))).toBe(true)
    expect(callInProgress(buildStore('idle'))).toBe(false)
  })
})
