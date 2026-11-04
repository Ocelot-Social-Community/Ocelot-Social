// What a user on one backend does has to reach a user on the other one. Written on FIRST and
// listened to on SECOND throughout, so the only way between them is Redis.

import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest'

import { CHAT_MESSAGE_ADDED, NOTIFICATION_ADDED } from '@constants/subscriptions'

import {
  buildUser,
  closeClients,
  closeRedis,
  eventually,
  FIRST,
  query,
  resetDatabase,
  SECOND,
  subscribe,
} from './helpers'

let alice: string
let bob: string

beforeEach(async () => {
  await resetDatabase()
  alice = await buildUser('alice')
  bob = await buildUser('bob')
})

afterEach(closeClients)

afterAll(async () => {
  closeRedis()
  const { getDriver } = await import('@db/neo4j')
  await getDriver().close()
})

const expectNoErrors = (result: { errors?: { message: string }[] }) => {
  expect(result.errors).toBeUndefined()
}

describe('across two backends', () => {
  it('a mention reaches the bell of a user on the other backend', async () => {
    const { event: notification } = await subscribe(
      SECOND,
      bob,
      NOTIFICATION_ADDED,
      `subscription {
        notificationAdded {
          reason
          read
          from { __typename ... on Post { title author { name } } }
          relatedUser { name }
        }
      }`,
    )

    const created = await query(
      FIRST,
      `mutation ($title: String!, $content: String!) {
        CreatePost(title: $title, content: $content, categoryIds: []) { id }
      }`,
      {
        token: alice,
        variables: {
          title: 'A post that mentions',
          content: '<a class="mention" data-mention-id="bob" href="/profile/bob">@bob</a>',
        },
      },
    )
    expectNoErrors(created)

    await expect(notification).resolves.toMatchObject({
      notificationAdded: {
        reason: 'mentioned_in_post',
        read: false,
        from: { __typename: 'Post', title: 'A post that mentions', author: { name: 'alice' } },
      },
    })
  })

  it('a chat message reaches the other backend', async () => {
    const { event: message } = await subscribe(
      SECOND,
      bob,
      CHAT_MESSAGE_ADDED,
      `subscription { chatMessageAdded { content seen author { id } } }`,
    )

    const sent = await query(
      FIRST,
      `mutation ($userId: ID, $content: String) {
        CreateMessage(userId: $userId, content: $content) { id }
      }`,
      { token: alice, variables: { userId: 'bob', content: 'Hello from the first backend' } },
    )
    expectNoErrors(sent)

    await expect(message).resolves.toMatchObject({
      chatMessageAdded: {
        content: 'Hello from the first backend',
        seen: false,
        author: { id: 'alice' },
      },
    })
  })

  it('a role change on one backend is in force on the other', async () => {
    const owner = await buildUser('owner', 'owner')
    const roles = `{ roles { name permissions } }`

    const created = await query(
      FIRST,
      `mutation { createRole(name: "visitor", permissions: []) { name } }`,
      { token: owner },
    )
    expectNoErrors(created)

    const seen = await eventually(
      async () => query(SECOND, roles, { token: owner }),
      ({ data }) =>
        (data?.roles as { name: string }[] | undefined)?.some(({ name }) => name === 'visitor') ??
        false,
    )

    expect(seen.data?.roles).toContainEqual({ name: 'visitor', permissions: [] })
  })

  it('a policy change on one backend is in force on the other', async () => {
    const owner = await buildUser('owner', 'owner')
    const policy = `{ policy { key value } }`
    const before = await query(SECOND, policy, { token: owner })
    expectNoErrors(before)
    const entry = (before.data?.policy as { key: string; value: string }[]).find(
      ({ key }) => key === 'publicRegistration',
    )
    const value = String(entry?.value !== 'true')

    const changed = await query(
      FIRST,
      `mutation ($value: String!) { setPolicy(key: publicRegistration, value: $value) { key } }`,
      { token: owner, variables: { value } },
    )
    expectNoErrors(changed)

    const after = await eventually(
      async () => query(SECOND, policy, { token: owner }),
      ({ data }) =>
        (data?.policy as { key: string; value: string }[] | undefined)?.some(
          (candidate) => candidate.key === 'publicRegistration' && candidate.value === value,
        ) ?? false,
    )

    expect(after.data?.policy).toContainEqual({ key: 'publicRegistration', value })
  })
})
