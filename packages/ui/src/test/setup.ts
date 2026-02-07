import { expect, vi } from 'vitest'
import { toHaveNoViolations } from 'vitest-axe/matchers'

expect.extend({ toHaveNoViolations })

// Suppress jsdom canvas warnings (not relevant for accessibility tests)
HTMLCanvasElement.prototype.getContext = vi.fn()
