import brandingSubscribe from './branding-subscribe.js'
import { reloadPage } from '~/utils/reloadPage'

// The reload is asserted through its module seam: jsdom 26 makes `window.location` non-configurable
// with a read-only `reload`, so stubbing the global is no longer possible (see utils/reloadPage.js).
jest.mock('~/utils/reloadPage', () => ({ reloadPage: jest.fn() }))

// Drive the plugin: it registers a store watcher whose getter returns a combined signature of
// activeBranding + brandingComposition; we capture the callback and invoke it with signatures (built
// the same way) to simulate policy changes, asserting whether the plugin triggers a full-page reload.
// `emit(active, composition)` mirrors the getter; `emit(undefined)` = snapshot still loading.
function setup(brandingId, brandingComposition = '') {
  if (brandingId === undefined) {
    delete window.__NUXT__
  } else {
    window.__NUXT__ = { brandingId, brandingComposition }
  }
  let callback
  const store = {
    watch: (_getter, cb) => {
      callback = cb
    },
  }
  brandingSubscribe({ store })
  return (active, composition = '') =>
    callback(active === undefined ? undefined : `${active || ''}\n${composition || ''}`)
}

describe('plugins/branding-subscribe', () => {
  const reload = reloadPage

  beforeEach(() => {
    window.sessionStorage.clear()
    reload.mockClear()
  })

  it('does nothing while the policy snapshot is still loading (undefined)', () => {
    const emit = setup('')
    emit(undefined)
    expect(reload).not.toHaveBeenCalled()
  })

  it('does not reload when the target already matches the rendered brand', () => {
    const emit = setup('yunite')
    emit('yunite')
    expect(reload).not.toHaveBeenCalled()
  })

  it('treats an empty rendered brand and an empty policy as vanilla (no reload)', () => {
    const emit = setup(undefined) // no brandingId → rendered vanilla
    emit('') // policy vanilla
    expect(reload).not.toHaveBeenCalled()
  })

  it('reloads once to apply a newly selected brand', () => {
    const emit = setup('') // rendered vanilla
    emit('yunite') // admin switches to yunite
    expect(reload).toHaveBeenCalledTimes(1)
  })

  it('reloads when only the per-slot composition changes (same base brand)', () => {
    const emit = setup('yunite', '') // rendered yunite, no per-slot overrides
    emit('yunite', '{"theme":"acme"}') // admin sets a theme override → reload
    expect(reload).toHaveBeenCalledTimes(1)
  })

  it('does not reload when base + composition both match the rendered signature', () => {
    const emit = setup('yunite', '{"identity":"acme"}')
    emit('yunite', '{"identity":"acme"}')
    expect(reload).not.toHaveBeenCalled()
  })

  it('reloads only ONCE for an unreachable target (baked-default image → vanilla loops otherwise)', () => {
    // Image bakes "nutrimind" as DEFAULT: SSR resolves an empty policy back to nutrimind, so the
    // rendered brandingId stays 'nutrimind' no matter how often we reload.
    const emit = setup('nutrimind')
    emit('') // admin switches to vanilla → reload attempt #1
    expect(reload).toHaveBeenCalledTimes(1)
    // After the reload the page is still nutrimind (server override) and the watcher fires again
    // with the same unreachable target — must NOT reload again.
    emit('')
    expect(reload).toHaveBeenCalledTimes(1)
  })

  it('reloads again for a DIFFERENT target after a prior attempt', () => {
    const emit = setup('nutrimind')
    emit('') // attempt vanilla (unreachable) → reload #1
    emit('') // same target → no reload
    emit('wir') // a different, reachable brand → reload #2
    expect(reload).toHaveBeenCalledTimes(2)
  })

  it('clears the attempt marker once a switch has taken effect, allowing a later re-switch', () => {
    // Simulate the reachable case across a reload: attempt yunite, then the reloaded page renders
    // yunite (target === loaded) which clears the marker; switching away and back to yunite reloads.
    const emitFirst = setup('') // rendered vanilla
    emitFirst('yunite') // reload #1
    expect(reload).toHaveBeenCalledTimes(1)

    // Reloaded page now rendered as yunite; a fresh plugin run sees loaded='yunite'.
    const emitReloaded = setup('yunite')
    emitReloaded('yunite') // matches → clears the marker
    emitReloaded('wir') // switch to another brand → reload (marker was cleared, not blocking)
    expect(reload).toHaveBeenCalledTimes(2)
  })

  it('degrades gracefully (still reloads) when sessionStorage is unavailable', () => {
    const emit = setup('')
    const original = Object.getOwnPropertyDescriptor(window, 'sessionStorage')
    Object.defineProperty(window, 'sessionStorage', {
      configurable: true,
      get() {
        throw new Error('blocked')
      },
    })
    expect(() => emit('yunite')).not.toThrow()
    expect(reload).toHaveBeenCalledTimes(1)
    Object.defineProperty(window, 'sessionStorage', original)
  })
})

// The tests above drive the CALLBACK with a hand-built signature; these drive the GETTER itself,
// because the normalisation of the stored base into the rendered one happens there.
function setupGetter(brandingId, brandingComposition = '') {
  window.__NUXT__ = { brandingId, brandingComposition }
  let getter, callback
  brandingSubscribe({
    store: {
      watch: (g, cb) => {
        getter = g
        callback = cb
      },
    },
  })
  return (snapshot) => callback(getter({}, { 'policy/snapshot': snapshot }))
}

describe('plugins/branding-subscribe (base normalisation)', () => {
  const reload = reloadPage

  beforeEach(() => {
    window.sessionStorage.clear()
    reload.mockClear()
  })

  // '@default' is how an explicit "no branding" is stored; the server reports the RESOLVED base ('').
  it('treats the vanilla sentinel as already applied when the page rendered vanilla', () => {
    const emit = setupGetter('')

    emit({ activeBranding: '@default', brandingComposition: '' })

    expect(reload).not.toHaveBeenCalled()
  })

  it('reloads when vanilla is chosen while a brand is rendered', () => {
    const emit = setupGetter('stage')

    emit({ activeBranding: '@default', brandingComposition: '' })

    expect(reload).toHaveBeenCalledTimes(1)
  })

  // Nothing chosen: the server resolves through the ops pin / baked marker, which the client cannot
  // see. Treating that as a divergence reloaded on the FIRST page load of every default-baked image
  // and burned the single reload attempt.
  it('never reloads for an unset base, whatever the page was rendered with', () => {
    const emit = setupGetter('stage')

    emit({ activeBranding: '', brandingComposition: '' })

    expect(reload).not.toHaveBeenCalled()
  })

  it('still reloads for a composition change while the base is unset', () => {
    const emit = setupGetter('stage', '')

    emit({ activeBranding: '', brandingComposition: '{"logos":"@default"}' })

    expect(reload).toHaveBeenCalledTimes(1)
  })
})
