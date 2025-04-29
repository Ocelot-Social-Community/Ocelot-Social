/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/restrict-template-expressions */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable promise/prefer-await-to-callbacks */
import { throwError, concat } from 'rxjs'
import { flatMap, mergeMap, map, catchError } from 'rxjs/operators'

import { getDriver } from '@db/neo4j'

export const description = `
  This migration merges duplicate :Location nodes. It became
  necessary after we realized that we had not set up constraints for Location.id in production.
`
export function up(next) {
  const driver = getDriver()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rxSession = driver.rxSession() as any
  rxSession
    .beginTransaction()
    .pipe(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      flatMap((transaction: any) =>
        concat(
          transaction
            .run(
              `
                    MATCH (location:Location)
                    RETURN location {.id}
                  `,
            )
            .records()
            .pipe(
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              map((record: any) => {
                const { id: locationId } = record.get('location')
                return { locationId }
              }),
              mergeMap(({ locationId }) => {
                return transaction
                  .run(
                    ` 
                    MATCH(location:Location {id: $locationId}), (location2:Location {id: $locationId})
                    WHERE location.id = location2.id AND id(location) < id(location2)
                    CALL apoc.refactor.mergeNodes([location, location2], { properties: 'combine', mergeRels: true }) YIELD node as updatedLocation
                    RETURN location {.*},updatedLocation {.*}
                  `,
                    { locationId },
                  )
                  .records()
                  .pipe(
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    map((record: any) => ({
                      location: record.get('location'),
                      updatedLocation: record.get('updatedLocation'),
                    })),
                  )
              }),
            ),
          transaction.commit(),
        ).pipe(catchError((error) => transaction.rollback().pipe(throwError(error)))),
      ),
    )
    .subscribe({
      next: ({ updatedLocation, location }) =>
        // eslint-disable-next-line no-console
        console.log(`
          Merged:
          =============================
          locationId: ${location.id}
          updatedLocation: ${location.id} => ${updatedLocation.id}
          =============================
        `),
      complete: () => {
        // eslint-disable-next-line no-console
        console.log('Merging of duplicate locations completed')
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
