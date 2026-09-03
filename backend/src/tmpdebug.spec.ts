/* eslint-disable */
// TEMPORARY diagnostic spec — delete before committing.
import { describe, beforeAll, it } from 'vitest'

import Factory, { cleanDatabase } from '@db/factories'
import DELETE_USER from '@graphql/queries/users/DeleteUser.gql'
import { createApolloTestSetup } from '@root/test/helpers'

let authenticatedUser: any = null
let mutate: any

describe('tmp debug', () => {
  beforeAll(async () => {
    await cleanDatabase()
    const plugins = [
      {
        // eslint-disable-next-line
        async requestDidStart() {
          return {
            // eslint-disable-next-line
            async didEncounterErrors(ctx: any) {
              for (const e of ctx.errors ?? []) {
                console.log('SERVER ERROR >>>', e.message, '|', e.originalError?.constructor?.name)
                console.log('STACK >>>', e.originalError?.stack ?? e.stack)
              }
            },
          }
        },
      },
    ]
    const setup = await createApolloTestSetup({ context: () => ({ authenticatedUser }), plugins: plugins as any })
    mutate = setup.mutate
  })

  it('prints the raw DeleteUser error', async () => {
    await Factory.build(
      'user',
      { id: 'plain-user', name: 'plain-user', role: 'user' },
      { email: 'plain-user@example.org', password: '1234' },
    )
    await Factory.build(
      'user',
      { id: 'the-owner', name: 'the-owner', role: 'owner' },
      { email: 'the-owner@example.org', password: '1234' },
    )
    authenticatedUser = { id: 'the-owner', role: 'owner', roleName: 'owner' }
    const result = await mutate({ mutation: DELETE_USER, variables: { id: 'plain-user' } })
    console.log('RAW ERRORS >>>', JSON.stringify(result.errors, Object.getOwnPropertyNames(Object.prototype).length ? undefined : undefined, 2))
    for (const e of result.errors ?? []) {
      console.log('ORIGINAL >>>', e.originalError, e.originalError?.stack)
      console.log('KEYS >>>', Object.keys(e), JSON.stringify(e.extensions))
    }
  })
})
