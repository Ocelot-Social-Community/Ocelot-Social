import { describe, it, expect, vi } from 'vitest'
import { defineComponent } from 'vue-demi'

// eslint-disable-next-line import-x/no-namespace -- needed to verify all components are registered
import * as components from './components'

// TODO: Remove this mock once there is at least one real component exported from ./components
// Mock components module to test the registration loop
vi.mock('./components', () => ({
  MockComponent: defineComponent({ name: 'MockComponent', template: '<div />' }),
}))

// Import plugin after mocking
const { default: OcelotUI } = await import('./plugin')

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
