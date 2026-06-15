import { allPermissionKeys } from '@src/permission'

import { DEFAULT_ROLES } from './defaults'
import { RoleService, RoleValidationError, createInMemoryRoleService } from './RoleService'
import { ADMIN_ROLE, MODERATOR_ROLE, OWNER_ROLE, USER_ROLE } from './types'

import type { RoleChangeEvent, RolePubSub } from './types'

const BASELINE = [
  'post.create',
  'comment.create',
  'socialMedia.create',
  'group.create',
  'group.create_hidden',
  'user.invite',
  'videoCall.create_public',
]

describe('RoleService', () => {
  describe('permissionsForRole (single-role resolution)', () => {
    const svc = createInMemoryRoleService()

    it('expands owner to the FULL catalog (expand-then-mask)', () => {
      expect([...svc.permissionsForRole(OWNER_ROLE)].sort()).toEqual(
        [...allPermissionKeys()].sort(),
      )
    })

    it('returns the self-contained baseline for the user role', () => {
      expect([...svc.permissionsForRole(USER_ROLE)].sort()).toEqual([...BASELINE].sort())
    })

    it('returns the self-contained moderator set (baseline + content.moderate)', () => {
      const perms = svc.permissionsForRole(MODERATOR_ROLE)
      expect(perms.has('content.moderate')).toBe(true)
      for (const baseline of BASELINE) expect(perms.has(baseline as never)).toBe(true)
    })

    it('returns the self-contained admin set (baseline + moderation + admin extras)', () => {
      const perms = svc.permissionsForRole(ADMIN_ROLE)
      expect(perms.has('content.moderate')).toBe(true)
      expect(perms.has('role.manage')).toBe(true)
      expect(perms.has('policy.manage')).toBe(true)
      expect(perms.has('badge.manage')).toBe(true)
      for (const baseline of BASELINE) expect(perms.has(baseline as never)).toBe(true)
    })

    it('falls back to the baseline for an unknown role (never permission-less)', () => {
      expect([...svc.permissionsForRole('ghost-role')].sort()).toEqual([...BASELINE].sort())
    })
  })

  describe('allRoles / getRole', () => {
    const svc = createInMemoryRoleService()

    it('returns roles broadest-first (owner, then by permission count)', () => {
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
        svc.upsertRole({ name: OWNER_ROLE, protected: false, permissions: [] }, 'u1'),
      ).rejects.toBeInstanceOf(RoleValidationError)
    })

    it('refuses to create a role flagged protected', async () => {
      await expect(
        svc.upsertRole({ name: 'evil', protected: true, permissions: [] }, 'u1'),
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

    // A neode-style record for readAllRoles (name/protected/permissions-as-JSON).
    const roleRecord = (role: { name: string; protected: boolean; permissions: string[] }) => ({
      get: (key: string) => {
        if (key === 'permissions') return JSON.stringify(role.permissions)
        if (key === 'protected') return role.protected
        return role.name
      },
    })

    const makeService = () => {
      const writes: Array<{ query: string; variables?: object }> = []
      const published: Array<{ channel: string; payload: { roleChanged: RoleChangeEvent } }> = []
      const fakeDb = {
        // Return the seeded defaults: a non-empty DB (established install), so
        // init() ensures the mandatory roles and its boot invariant is satisfied.
        query: async () => Promise.resolve({ records: DEFAULT_ROLES.map(roleRecord) }),
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
      await svc.upsertRole({ name: 'temp', protected: false, permissions: [] }, 'admin-1')

      await svc.deleteRole('temp', 'admin-1')

      expect(svc.getRole('temp')).toBeUndefined()
      const event = published[published.length - 1]?.payload.roleChanged
      expect(event).toMatchObject({ name: 'temp', definition: null, actor: 'admin-1' })
    })

    it('refuses to start (boot invariant) when a mandatory role is missing after seeding', async () => {
      // The write never lands (fake write is a no-op), so `user` stays missing even
      // after the self-heal attempt. init() must reject so a broken instance never
      // serves traffic.
      const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
      const fakeDb = {
        query: async () =>
          Promise.resolve({
            records: DEFAULT_ROLES.filter((role) => role.name !== USER_ROLE).map(roleRecord),
          }),
        write: async () => Promise.resolve({ records: [] }),
      } as unknown as DbArg
      const svc = new RoleService(fakeDb)
      await expect(svc.init()).rejects.toThrow(/mandatory role node\(s\) missing after seeding/)
      warn.mockRestore()
    })

    it('seeds the full default set on a fresh (empty) install', async () => {
      const writes: Array<{ variables?: { name?: string } }> = []
      let queryCalls = 0
      const fakeDb = {
        query: async () => {
          queryCalls += 1
          // First read (the fresh-check) sees an empty DB; later reads reflect the
          // now-seeded roles so init()'s cache + invariant pass.
          return Promise.resolve({ records: queryCalls === 1 ? [] : DEFAULT_ROLES.map(roleRecord) })
        },
        write: async (statement: { variables?: { name?: string } }) => {
          writes.push(statement)
          return Promise.resolve({ records: [] })
        },
      } as unknown as DbArg
      const svc = new RoleService(fakeDb)
      await svc.init()

      const seeded = writes.map((w) => w.variables?.name)
      expect(seeded).toEqual(
        expect.arrayContaining([OWNER_ROLE, ADMIN_ROLE, MODERATOR_ROLE, USER_ROLE]),
      )
    })

    it('writes nothing on an established install where all roles already exist', async () => {
      const writes: Array<{ variables?: { name?: string } }> = []
      const fakeDb = {
        query: async () => Promise.resolve({ records: DEFAULT_ROLES.map(roleRecord) }), // all present
        write: async (statement: { variables?: { name?: string } }) => {
          writes.push(statement)
          return Promise.resolve({ records: [] })
        },
      } as unknown as DbArg
      const svc = new RoleService(fakeDb)
      await svc.init()

      // Steady state: a single read, zero writes — no MERGE churn per boot.
      expect(writes).toHaveLength(0)
    })

    it('does not resurrect a role deleted by an event that arrives during init()', async () => {
      // Race: another instance deletes `admin` while this one is booting. The delete
      // event lands during the role read (cache still empty → delete is a no-op), and
      // the read snapshot is stale (still contains admin). init() must NOT re-add it.
      let onChange: ((payload: { roleChanged: RoleChangeEvent }) => void) | undefined
      let fired = false
      const fakeDb = {
        query: async () => {
          // Fire the delete mid-read, before the cache-fill loop runs.
          if (!fired && onChange) {
            fired = true
            onChange({
              roleChanged: {
                name: ADMIN_ROLE,
                definition: null,
                actor: 'other-instance',
                timestamp: 't',
              },
            })
          }
          return Promise.resolve({ records: DEFAULT_ROLES.map(roleRecord) }) // stale: still has admin
        },
        write: async () => Promise.resolve({ records: [] }),
      } as unknown as DbArg
      const fakePubsub: RolePubSub = {
        publish: () => undefined,
        subscribe: async (_channel, listener) => {
          onChange = listener as typeof onChange
          return Promise.resolve(1)
        },
        unsubscribe: () => undefined,
      }
      const svc = new RoleService(fakeDb)
      await svc.init(fakePubsub)

      expect(svc.getRole(ADMIN_ROLE)).toBeUndefined() // stayed deleted, not resurrected
      // The mandatory roles (and the unaffected optional one) are still cached.
      expect(svc.getRole(OWNER_ROLE)).toBeDefined()
      expect(svc.getRole(USER_ROLE)).toBeDefined()
      expect(svc.getRole(MODERATOR_ROLE)).toBeDefined()
    })

    it('self-heals only the missing mandatory role (not admin/moderator) and warns', async () => {
      const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
      const writes: Array<{ variables?: { name?: string } }> = []
      let queryCalls = 0
      const fakeDb = {
        query: async () => {
          queryCalls += 1
          // First read: `user` is missing on a non-empty DB. Re-read (after the
          // heal write) reflects it restored, so the boot invariant passes.
          return Promise.resolve({
            records:
              queryCalls === 1
                ? DEFAULT_ROLES.filter((role) => role.name !== USER_ROLE).map(roleRecord)
                : DEFAULT_ROLES.map(roleRecord),
          })
        },
        write: async (statement: { variables?: { name?: string } }) => {
          writes.push(statement)
          return Promise.resolve({ records: [] })
        },
      } as unknown as DbArg
      const svc = new RoleService(fakeDb)
      await svc.init()

      const seeded = writes.map((w) => w.variables?.name)
      expect(seeded).toEqual([USER_ROLE]) // only the missing mandatory role
      expect(seeded).not.toContain(ADMIN_ROLE)
      expect(seeded).not.toContain(MODERATOR_ROLE)
      expect(warn).toHaveBeenCalledWith(expect.stringContaining(USER_ROLE))
      warn.mockRestore()
    })
  })
})
