import { describe, expect, it, vi } from 'vitest'

import inviteCodesResolvers from './inviteCodes'
import roomsResolvers from './rooms'

import type { Context } from '@src/context'

// Two acts whose Cypher insists on a `MEMBER_OF` edge even though the right behind them can be
// held from the network side: generating a group invite code, and opening the group's chat room.
//
// Before the network rights existed, holding the right implied the membership and the "matched
// nothing" branch was unreachable. It is reachable now — a moderator or admin whose `.any_*`
// right folds the group catalog passes the shield and has no edge — and these two tests pin what
// happens then: the act fails, nobody is quietly added to the group, and the message says so.
// E16 is the reason it must stay that way: the network path never writes a membership for the
// person using it, in a hidden group least of all.

const failingWrite = () => vi.fn(async () => Promise.resolve({ records: [] }))

describe('generateGroupInviteCode without a membership', () => {
  const contextFor = (write: ReturnType<typeof failingWrite>) =>
    ({
      user: { id: 'network-admin' },
      policy: { get: () => 10 },
      groupAuthorization: {
        forGroup: vi.fn(async () => Promise.resolve({ has: () => true })),
      },
      database: {
        // Both reads are counts: how many codes this user already made for the group, and
        // whether the generated code is taken. Zero to both, so the only empty answer left is
        // the write's.
        query: vi.fn(async () => Promise.resolve({ records: [{ get: () => '0' }] })),
        write,
      },
    }) as unknown as Context

  it('refuses rather than inventing a code nobody can be invited with', async () => {
    const write = failingWrite()

    await expect(
      inviteCodesResolvers.Mutation.generateGroupInviteCode(
        {},
        { groupId: 'g1' },
        contextFor(write),
        null,
      ),
    ).rejects.toThrow('Not Authorized!')
    // The statement ran — it is the membership check — and matched nothing, which is the whole
    // signal. Nothing was created.
    expect(write).toHaveBeenCalled()
  })
})

describe('CreateGroupRoom without a membership', () => {
  const contextFor = () => {
    const run = vi.fn(async () => Promise.resolve({ records: [] }))
    const close = vi.fn(async () => Promise.resolve())
    const context = {
      user: { id: 'network-admin' },
      driver: {
        session: () => ({
          writeTransaction: (work: (tx: { run: typeof run }) => unknown) => work({ run }),
          close,
        }),
      },
    } as unknown as Context
    return { context, run, close }
  }

  it('says which assumption failed instead of answering with a room of nothing', async () => {
    // `[room] = records.map(...)` on an empty answer is `undefined`, and the next line reads
    // `room.id` off it: without the guard this is a TypeError, which tells the user nothing.
    const { context, run, close } = contextFor()

    await expect(
      roomsResolvers.Mutation.CreateGroupRoom({}, { groupId: 'g1' }, context, null),
    ).rejects.toThrow('Could not create group room. User may not be a member of the group.')

    expect(run).toHaveBeenCalled()
    // Still handed back, failure or not — a session left open is a connection out of the pool
    // for good.
    expect(close).toHaveBeenCalled()
  })
})
