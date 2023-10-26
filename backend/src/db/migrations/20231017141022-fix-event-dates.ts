import { getDriver } from '../../db/neo4j'

export const description = `
Transform event start and end date of format 'YYYY-MM-DD HH:MM:SS' in CEST
to ISOString in UTC.
`

export async function up(next) {
  const driver = getDriver()
  const session = driver.session()
  const transaction = session.beginTransaction()

  try {
    const events = await transaction.run(`
      MATCH (event:Event)
      WHERE NOT event.eventStart CONTAINS 'T'
      RETURN event.id, event.eventStart, event.eventEnd
    `)
    for (const event of events.records) {
      let [id, eventStart, eventEnd] = event
      let date = new Date(eventStart)
      date.setHours(date.getHours() - 1)
      eventStart = date.toISOString()
      if (eventEnd) {
        date = new Date(eventEnd)
        date.setHours(date.getHours() - 1)
        eventEnd = date.toISOString()
      }
      await transaction.run(`
        MATCH (e:Event { id: '${id}' })
        SET e.eventStart = '${eventStart}'
        SET (CASE WHEN exists(e.eventEnd) THEN e END).eventEnd = '${eventEnd}'
        RETURN e
      `)
    }
    await transaction.commit()
    next()
  } catch (error) {
    // eslint-disable-next-line no-console
    console.log(error)
    await transaction.rollback()
    // eslint-disable-next-line no-console
    console.log('rolled back')
    throw new Error(error)
  } finally {
    session.close()
  }
}

export async function down(next) {
  const driver = getDriver()
  const session = driver.session()
  const transaction = session.beginTransaction()

  try {
    // No sense in running this down
    next()
  } catch (error) {
    // eslint-disable-next-line no-console
    console.log(error)
    await transaction.rollback()
    // eslint-disable-next-line no-console
    console.log('rolled back')
    throw new Error(error)
  } finally {
    session.close()
  }
}
