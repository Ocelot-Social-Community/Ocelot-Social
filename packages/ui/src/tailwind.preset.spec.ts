import { describe, it, expect, vi, afterEach, expectTypeOf } from 'vitest'

import { ocelotPreset, requiredCssVariables, validateCssVariables } from './tailwind.preset'

describe('tailwind.preset', () => {
  describe('ocelotPreset', () => {
    it('exports a valid Tailwind preset with theme.extend structure', () => {
      expect(ocelotPreset).toBeDefined()
      expect(ocelotPreset).toHaveProperty('theme')
      expect(ocelotPreset.theme).toHaveProperty('extend')
    })
  })

  describe('requiredCssVariables', () => {
    it('exports an array', () => {
      expect(Array.isArray(requiredCssVariables)).toBe(true)
    })

    it('contains only strings', () => {
      for (const variable of requiredCssVariables) {
        expectTypeOf(variable).toBeString()
      }
    })

    it('all variables start with --', () => {
      // This test validates the format constraint.
      for (const variable of requiredCssVariables) {
        expect(variable.startsWith('--')).toBe(true)
      }

      // Ensure test runs even with empty array
      expect(requiredCssVariables.every((v) => v.startsWith('--'))).toBe(true)
    })
  })

  describe(validateCssVariables, () => {
    afterEach(() => {
      vi.unstubAllGlobals()
      vi.restoreAllMocks()
    })

    it('does nothing when window is undefined (SSR)', () => {
      vi.stubGlobal('window', undefined)

      expect(() => {
        validateCssVariables()
      }).not.toThrowError()
    })

    it('does not warn when all variables are defined', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const mockGetPropertyValue = vi.fn<(prop: string) => string>().mockReturnValue('some-value')

      vi.stubGlobal('window', {})
      vi.stubGlobal('document', {
        documentElement: {},
      })
      vi.stubGlobal('getComputedStyle', () => ({
        getPropertyValue: mockGetPropertyValue,
      }))

      validateCssVariables()

      expect(consoleWarnSpy).not.toHaveBeenCalled()
    })

    it('warns when variables are missing', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const mockGetPropertyValue = vi.fn<(prop: string) => string>().mockReturnValue('')

      vi.stubGlobal('window', {})
      vi.stubGlobal('document', {
        documentElement: {},
      })
      vi.stubGlobal('getComputedStyle', () => ({
        getPropertyValue: mockGetPropertyValue,
      }))

      // Temporarily add a required variable for testing
      const originalVariables = [...requiredCssVariables]
      requiredCssVariables.push('--test-variable')

      validateCssVariables()

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Missing required CSS variables'),
      )
      expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('--test-variable'))

      // Restore original state
      requiredCssVariables.length = 0
      requiredCssVariables.push(...originalVariables)
    })
  })
})
