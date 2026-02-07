import type { AxeResults } from 'axe-core'

interface AxeMatchers {
  toHaveNoViolations: () => void
}

declare module 'vitest' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface Assertion extends AxeMatchers {}
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface AsymmetricMatchersContaining extends AxeMatchers {}
}

declare module 'vitest-axe' {
  export function axe(element: Element | string): Promise<AxeResults>
}

declare module 'vitest-axe/matchers' {
  import type { AxeResults } from 'axe-core'

  interface MatcherResult {
    pass: boolean
    message: () => string | undefined
    actual: unknown
  }
  export function toHaveNoViolations(results: AxeResults): MatcherResult
}
