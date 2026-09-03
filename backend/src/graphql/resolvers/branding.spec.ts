import { describe, beforeEach, it, expect } from 'vitest'

import { UserInputError } from '@graphql/errors'
import { PolicyValidationError } from '@src/policy'

import brandingResolver from './branding'

import type { Context } from '@src/context'
import type { Mock } from 'vitest'

describe('branding resolvers', () => {
  let set: Mock
  let context: Context

  const call = async (
    name: 'setActiveBranding' | 'setBrandingComposition',
    args: Record<string, string>,
  ) =>
    // eslint-disable-next-line security/detect-object-injection -- name is a strict resolver-name union
    (brandingResolver.Mutation[name] as (p: unknown, a: unknown, c: Context) => Promise<string>)(
      null,
      args,
      context,
    )

  beforeEach(() => {
    set = vi.fn<(...args: unknown[]) => Promise<unknown>>().mockResolvedValue(undefined)
    context = { policy: { set }, user: { id: 'u1' } } as unknown as Context
  })

  describe('setActiveBranding', () => {
    it('persists the id (branding.manage path) and echoes it back', async () => {
      await expect(call('setActiveBranding', { id: 'yunite' })).resolves.toBe('yunite')
      expect(set).toHaveBeenCalledWith('activeBranding', 'yunite', 'u1')
    })

    it('maps a PolicyValidationError to a UserInputError', async () => {
      set.mockRejectedValue(new PolicyValidationError('bad'))

      await expect(call('setActiveBranding', { id: 'x' })).rejects.toThrow(UserInputError)
    })
  })

  describe('setBrandingComposition', () => {
    it('accepts the empty string (clears all per-slot overrides)', async () => {
      await expect(call('setBrandingComposition', { composition: '' })).resolves.toBe('')
      expect(set).toHaveBeenCalledWith('brandingComposition', '', 'u1')
    })

    it('accepts a JSON object and persists it verbatim', async () => {
      const json = JSON.stringify({ theme: 'acme/dark', identity: 'mybrand' })

      await expect(call('setBrandingComposition', { composition: json })).resolves.toBe(json)
      expect(set).toHaveBeenCalledWith('brandingComposition', json, 'u1')
    })

    it('rejects malformed JSON without persisting', async () => {
      await expect(call('setBrandingComposition', { composition: '{bad' })).rejects.toThrow(
        UserInputError,
      )
      expect(set).not.toHaveBeenCalled()
    })

    it('rejects a non-object JSON value (array / scalar)', async () => {
      await expect(call('setBrandingComposition', { composition: '[]' })).rejects.toThrow(
        UserInputError,
      )
      await expect(call('setBrandingComposition', { composition: '"x"' })).rejects.toThrow(
        UserInputError,
      )
      expect(set).not.toHaveBeenCalled()
    })
  })
})
