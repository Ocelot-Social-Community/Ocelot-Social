import registry, { modulesFor } from './modules'

const storeWith = (getters) => ({ getters })

describe('dock modules', () => {
  const left = { id: 'l', side: 'left', routes: ['*'], enabled: () => true }
  const feedOnly = { id: 'f', side: 'right', routes: ['index'], enabled: () => true }
  const everywhere = { id: 'e', side: 'right', routes: ['*'], enabled: () => true }
  const switchedOff = { id: 'o', side: 'right', routes: ['*'], enabled: () => false }
  const modules = [left, feedOnly, everywhere, switchedOff]

  it('picks the modules of one side, on their pages, while enabled', () => {
    expect(modulesFor(modules, { side: 'right', routeName: 'index', store: {} })).toEqual([
      feedOnly,
      everywhere,
    ])
    expect(modulesFor(modules, { side: 'right', routeName: 'post-id-slug', store: {} })).toEqual([
      everywhere,
    ])
    expect(modulesFor(modules, { side: 'left', routeName: 'index', store: {} })).toEqual([left])
  })

  describe('running video calls', () => {
    const module = registry.find(({ id }) => id === 'activeVideoCalls')

    it('sits on the right, on the main feed only, under a camera', () => {
      expect(module.side).toBe('right')
      expect(module.icon).toBe('videoCamera')
      expect(module.label).toBe('dock.activeVideoCalls.flag')
      expect(module.routes).toEqual(['index'])
    })

    it('follows whether video calls are enabled', () => {
      expect(module.enabled({ store: storeWith({ 'videoCall/enabled': true }) })).toBe(true)
      expect(module.enabled({ store: storeWith({ 'videoCall/enabled': false }) })).toBe(false)
    })

    it('loads its component on demand', async () => {
      const { default: component } = await module.component()
      expect(component.name).toBe('ActiveVideoCalls')
    })
  })
})
