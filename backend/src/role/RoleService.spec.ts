import { allPermissionKeys } from '@src/permission'

import { DEFAULT_ROLES } from './defaults'
import { RoleService, RoleValidationError, createInMemoryRoleService } from './RoleService'
import { ADMIN_ROLE, MODERATOR_ROLE, OWNER_ROLE, USER_ROLE } from './types'

import type { RoleChangeEvent, RolePubSub } from './types'

const BASELINE = ['post.create', 'group.create', 'group.create_hidden', 'user.invite']

describe('RoleService', () => {
  describe('permissionsForRoles (base set for the request context)', () => {
    const svc = createInMemoryRoleService()

    it('expands owner to the FULL catalog (expand-then-mask)', () => {
      expect([...svc.permissionsForRoles([OWNER_ROLE])].sort()).toEqual(
        [...allPermissionKeys()].sort(),
      )
    })

    it('expands owner to all even when combined with other roles', () => {
      expect(svc.permissionsForRoles([USER_ROLE, OWNER_ROLE]).size).toBe(allPermissionKeys().length)
    })

    it('returns the baseline for the user role', () => {
      expect([...svc.permissionsForRoles([USER_ROLE])].sort()).toEqual([...BASELINE].sort())
    })

    it('unions roles additively — [user, moderator] adds content.moderate', () => {
      const perms = svc.permissionsForRoles([USER_ROLE, MODERATOR_ROLE])
      expect(perms.has('content.moderate')).toBe(true)
      for (const baseline of BASELINE) expect(perms.has(baseline as never)).toBe(true)
    })

    it('admin holds the moderation + admin extras on top of the baseline (via [user, admin])', () => {
      const perms = svc.permissionsForRoles([USER_ROLE, ADMIN_ROLE])
      expect(perms.has('content.moderate')).toBe(true)
      expect(perms.has('role.manage')).toBe(true)
      expect(perms.has('policy.manage')).toBe(true)
      expect(perms.has('badge.manage')).toBe(true)
    })

    it('ignores unknown role names', () => {
      expect(svc.permissionsForRoles(['ghost-role'])).toEqual(new Set())
      // a known role alongside an unknown one still contributes
      expect(svc.permissionsForRoles([USER_ROLE, 'ghost-role']).size).toBe(BASELINE.length)
    })

    it('returns an empty set for no roles', () => {
      expect(svc.permissionsForRoles([])).toEqual(new Set())
    })
  })

  describe('allRoles / getRole', () => {
    const svc = createInMemoryRoleService()

    it('returns roles ranked high → low', () => {
      const names = svc.allRoles().map((role) => role.name)
      expect(names).toEqual([OWNER_ROLE, ADMIN_ROLE, MODERATOR_ROLE, USER_ROLE])
    })

    it('looks up a role by name', () => {
      expect(svc.getRole(OWNER_ROLE)?.protected).toBe(true)
      expect(svc.getRole(USER_ROLE)?.protected).toBe(false)
      expect(svc.getRole('nope')).toBeUndefined()
    })
  })

  describe('applyExternalChange', () => {
    it('upserts a role into the cache, sanitising its permissions', () => {
      const svc = createInMemoryRoleService([])
      const event: RoleChangeEvent = {
        name: 'editor',
        definition: {
          name: 'editor',
          description: null,
          rank: 20,
          protected: false,
          permissions: ['post.create', 'ghost.permission'] as never,
        },
        actor: 'u1',
        timestamp: 't',
      }
      svc.applyExternalChange(event)
      expect(svc.getRole('editor')?.permissions).toEqual(['post.create'])
    })

    it('removes a role on a delete event', () => {
      const svc = createInMemoryRoleService(DEFAULT_ROLES)
      svc.applyExternalChange({
        name: MODERATOR_ROLE,
        definition: null,
        actor: 'u1',
        timestamp: 't',
      })
      expect(svc.getRole(MODERATOR_ROLE)).toBeUndefined()
    })
  })

  describe('upsert / delete guards (throw before any DB access)', () => {
    const svc = createInMemoryRoleService()

    it('refuses to edit a protected role', async () => {
      await expect(
        svc.upsertRole(
          { name: OWNER_ROLE, description: null, rank: 1, protected: false, permissions: [] },
          'u1',
        ),
      ).rejects.toBeInstanceOf(RoleValidationError)
    })

    it('refuses to create a role flagged protected', async () => {
      await expect(
        svc.upsertRole(
          { name: 'evil', description: null, rank: 1, protected: true, permissions: [] },
          'u1',
        ),
      ).rejects.toBeInstanceOf(RoleValidationError)
    })

    it('refuses to delete a protected role', async () => {
      await expect(svc.deleteRole(OWNER_ROLE, 'u1')).rejects.toBeInstanceOf(RoleValidationError)
    })

    it('refuses to delete the baseline user role (implicit for every member)', async () => {
      await expect(svc.deleteRole(USER_ROLE, 'u1')).rejects.toBeInstanceOf(RoleValidationError)
      // but the baseline stays editable
      expect(svc.getRole(USER_ROLE)?.protected).toBe(false)
    })

    it('refuses to delete an unknown role', async () => {
      await expect(svc.deleteRole('nope', 'u1')).rejects.toBeInstanceOf(RoleValidationError)
    })
  })

  describe('upsert / delete success paths (fake DB + pubsub)', () => {
    type DbArg = ConstructorParameters<typeof RoleService>[0]

    const makeService = () => {
      const writes: Array<{ query: string; variables?: object }> = []
      const published: Array<{ channel: string; payload: { roleChanged: RoleChangeEvent } }> = []
      const fakeDb = {
        query: async () => Promise.resolve({ records: [] }),
        write: async (statement: { query: string; variables?: object }) => {
          writes.push(statement)
          return Promise.resolve({ records: [] })
        },
      } as unknown as DbArg
      const fakePubsub: RolePubSub = {
        publish: (channel, payload) => {
          published.push({ channel, payload: payload as { roleChanged: RoleChangeEvent } })
        },
        subscribe: async () => Promise.resolve(1),
        unsubscribe: () => undefined,
      }
      return { svc: new RoleService(fakeDb), writes, published, fakePubsub }
    }

    it('persists, caches and broadcasts a created role (permissions sanitised)', async () => {
      const { svc, writes, published, fakePubsub } = makeService()
      await svc.init(fakePubsub)

      const created = await svc.upsertRole(
        {
          name: 'badge-setter',
          description: 'Can grant badges',
          rank: 15,
          protected: false,
          permissions: ['badge.manage', 'ghost.permission'],
        },
        'admin-1',
      )

      expect(created.permissions).toEqual(['badge.manage'])
      expect(svc.getRole('badge-setter')?.permissions).toEqual(['badge.manage'])
      // last write is the role upsert
      expect(writes[writes.length - 1]?.variables).toMatchObject({
        name: 'badge-setter',
        actor: 'admin-1',
      })
      const event = published[published.length - 1]?.payload.roleChanged
      expect(event?.name).toBe('badge-setter')
      expect(event?.definition?.permissions).toEqual(['badge.manage'])
    })

    it('deletes a role and broadcasts a tombstone', async () => {
      const { svc, published, fakePubsub } = makeService()
      await svc.init(fakePubsub)
      await svc.upsertRole(
        { name: 'temp', description: null, rank: 1, protected: false, permissions: [] },
        'admin-1',
      )

      await svc.deleteRole('temp', 'admin-1')

      expect(svc.getRole('temp')).toBeUndefined()
      const event = published[published.length - 1]?.payload.roleChanged
      expect(event).toMatchObject({ name: 'temp', definition: null, actor: 'admin-1' })
    })
  })
})
