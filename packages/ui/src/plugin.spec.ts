import { describe, expect, it, vi } from 'vitest'

// eslint-disable-next-line import-x/no-namespace -- needed to verify all components are registered
import * as components from './components'
import OcelotUI from './plugin'

describe('ocelotUI Plugin', () => {
  it('has an install function', () => {
    expect(OcelotUI.install).toBeTypeOf('function')
  })

  it('registers only Os-prefixed components', () => {
    const mockApp = {
      component: vi.fn(),
    }

    OcelotUI.install?.(mockApp as never)

    // Filter to only Os-prefixed entries (actual Vue components)
    const osComponents = Object.entries(components).filter(([name]) => name.startsWith('Os'))

    expect(mockApp.component).toHaveBeenCalledTimes(osComponents.length)

    for (const [name, component] of osComponents) {
      expect(mockApp.component).toHaveBeenCalledWith(name, component)
    }
  })

  it('does not register non-component exports', () => {
    const mockApp = {
      component: vi.fn(),
    }

    OcelotUI.install?.(mockApp as never)

    // buttonVariants should NOT be registered
    const callArgs = mockApp.component.mock.calls.map((call: unknown[]) => call[0])

    expect(callArgs).not.toContain('buttonVariants')
  })

  it('works without throwing', () => {
    const mockApp = {
      component: vi.fn(),
    }

    expect(() => {
      OcelotUI.install?.(mockApp as never)
    }).not.toThrowError()
  })
})
