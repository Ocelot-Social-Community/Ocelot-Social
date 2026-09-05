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

    // Only a validation failure is the caller's fault. An infrastructure failure (the Neo4j
    // write, the Redis broadcast) must keep its own identity: relabelling it as a UserInputError
    // would report a 4xx-style "bad input" to an admin who supplied a perfectly valid brand id,
    // and Sentry's resolver middleware would stop treating it as an incident.
    it('rethrows a non-validation failure unchanged', async () => {
      const outage = new Error('Neo4j write failed')
      set.mockRejectedValue(outage)

      await expect(call('setActiveBranding', { id: 'x' })).rejects.toBe(outage)
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

    // The composition passes the resolver's own JSON check but can still be refused by the
    // policy schema (unknown key, wrong type). That rejection describes the admin's input, so it
    // has to reach them as one instead of as an opaque server error.
    it('maps a PolicyValidationError to a UserInputError', async () => {
      set.mockRejectedValue(new PolicyValidationError('unknown policy key'))

      await expect(call('setBrandingComposition', { composition: '{}' })).rejects.toThrow(
        UserInputError,
      )
    })

    it('rethrows a non-validation failure unchanged', async () => {
      const outage = new Error('Redis publish failed')
      set.mockRejectedValue(outage)

      await expect(call('setBrandingComposition', { composition: '{}' })).rejects.toBe(outage)
    })
  })

  // Both mutations are behind `branding.manage`, so an unauthenticated caller cannot normally
  // reach them — but the actor is written into the policy audit trail, and `user?.id` would
  // record a literal `undefined` there if the context ever arrives without a user (an internal
  // caller, a shield rule relaxed later). 'unknown' keeps that entry readable.
  describe('audit actor without an authenticated user', () => {
    beforeEach(() => {
      context = { policy: { set } } as unknown as Context
    })

    it('records "unknown" as the actor', async () => {
      await call('setActiveBranding', { id: 'yunite' })
      await call('setBrandingComposition', { composition: '' })

      expect(set).toHaveBeenCalledWith('activeBranding', 'yunite', 'unknown')
      expect(set).toHaveBeenCalledWith('brandingComposition', '', 'unknown')
    })
  })
})
