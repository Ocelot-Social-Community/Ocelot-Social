import { describe, it, expect, vi } from 'vitest'

// eslint-disable-next-line import-x/no-namespace -- needed to verify all components are registered
import * as components from './components'
import OcelotUI from './plugin'

describe('ocelotUI Plugin', () => {
  it('has an install function', () => {
    expect(OcelotUI.install).toBeTypeOf('function')
  })

  it('registers all exported components', () => {
    const mockApp = {
      component: vi.fn(),
    }

    OcelotUI.install?.(mockApp as never)

    const componentEntries = Object.entries(components)

    expect(mockApp.component).toHaveBeenCalledTimes(componentEntries.length)

    for (const [name, component] of componentEntries) {
      expect(mockApp.component).toHaveBeenCalledWith(name, component)
    }
  })

  it('works with empty components', () => {
    const mockApp = {
      component: vi.fn(),
    }

    expect(() => {
      OcelotUI.install?.(mockApp as never)
    }).not.toThrow()
  })
})
