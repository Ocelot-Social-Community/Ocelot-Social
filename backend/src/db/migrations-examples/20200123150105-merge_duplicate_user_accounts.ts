/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/restrict-template-expressions */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable promise/prefer-await-to-callbacks */
import { throwError, concat } from 'rxjs'
import { flatMap, mergeMap, map, catchError, filter } from 'rxjs/operators'

import { getDriver } from '@db/neo4j'
import normalizeEmail from '@graphql/resolvers/helpers/normalizeEmail'

export const description = `
  This migration merges duplicate :User and :EmailAddress nodes. It became
  necessary after we implemented the email normalization but forgot to migrate
  the existing data. Some (40) users decided to just register with a new account
  but the same email address. On signup our backend would normalize the email,
  which is good, but would also keep the existing unnormalized email address.

  This led to about 40 duplicate user and email address nodes in our database.
`
export function up(next) {
  const driver = getDriver()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rxSession = driver.rxSession() as any
  rxSession
    .beginTransaction()
    .pipe(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      flatMap((txc: any) =>
        concat(
          txc
            .run('MATCH (email:EmailAddress) RETURN email {.email}')
            .records()
            .pipe(
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              map((record: any) => {
                const { email } = record.get('email')
                const normalizedEmail = normalizeEmail(email)
                return { email, normalizedEmail }
              }),
              filter(({ email, normalizedEmail }) => email !== normalizedEmail),
              mergeMap(({ email, normalizedEmail }) => {
                return txc
                  .run(
                    `
                  MATCH (oldUser:User)-[:PRIMARY_EMAIL]->(oldEmail:EmailAddress {email: $email})
                  MATCH (user:User)-[:PRIMARY_EMAIL]->(email:EmailAddress {email: $normalizedEmail})
                  WITH oldUser, oldEmail, user, email
                  CALL apoc.refactor.mergeNodes([user, oldUser], { properties: { createdAt: 'overwrite', \`.*\`: 'discard' }, mergeRels: true }) YIELD node as mergedUser
                  CALL apoc.refactor.mergeNodes([email, oldEmail], { properties: { createdAt: 'overwrite', verifiedAt: 'overwrite', \`.*\`: 'discard' }, mergeRels: true }) YIELD node as mergedEmail
                  RETURN user {.*}, email {.*}
              `,
                    { email, normalizedEmail },
                  )
                  .records()
                  .pipe(
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    map((r: any) => ({
                      oldEmail: email,
                      email: r.get('email'),
                      user: r.get('user'),
                    })),
                  )
              }),
            ),
          txc.commit(),
        ).pipe(catchError((err) => txc.rollback().pipe(throwError(err)))),
      ),
    )
    .subscribe({
      next: ({ user, email, _oldUser, oldEmail }) =>
        // eslint-disable-next-line no-console
        console.log(`
          Merged:
          =============================
          userId: ${user.id}
          email: ${oldEmail} => ${email.email}
          =============================
        `),
      complete: () => {
        // eslint-disable-next-line no-console
        console.log('Merging of duplicate users completed')
        next()
      },
      error: (error) => {
        next(new Error(error), null)
      },
    })
}

export function down(next) {
  next(new Error('Irreversible migration'))
}
