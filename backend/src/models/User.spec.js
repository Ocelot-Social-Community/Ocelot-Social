import { cleanDatabase } from '../db/factories'
import { getNeode } from '../db/neo4j'

const neode = getNeode()

beforeAll(async () => {
  await cleanDatabase()
})

afterAll(async () => {
  await cleanDatabase()
})

// TODO: avoid database clean after each test in the future if possible for performance and flakyness reasons by filling the database step by step, see issue https://github.com/Ocelot-Social-Community/Ocelot-Social/issues/4543
afterEach(async () => {
  await cleanDatabase()
})

describe('role', () => {
  it('defaults to `user`', async () => {
    const user = await neode.create('User', { name: 'John' })
    await expect(user.toJson()).resolves.toEqual(
      expect.objectContaining({
        role: 'user',
      }),
    )
  })
})

describe('slug', () => {
  it('normalizes to lowercase letters', async () => {
    const user = await neode.create('User', { slug: 'Matt' })
    await expect(user.toJson()).resolves.toEqual(
      expect.objectContaining({
        slug: 'matt',
      }),
    )
  })

  it('must be unique', async (done) => {
    await neode.create('User', { slug: 'Matt' })
    try {
      await expect(neode.create('User', { slug: 'Matt' })).rejects.toThrow('already exists')
      done()
    } catch (error) {
      throw new Error(`
        ${error}

        Probably your database has no unique constraints!

        To see all constraints go to http://localhost:7474/browser/ and
        paste the following:
        \`\`\`
          CALL db.constraints();
        \`\`\`

        Learn how to setup the database here:
        https://docs.human-connection.org/human-connection/backend#database-indices-and-constraints
      `)
    }
  })

  describe('characters', () => {
    const createUser = (attrs) => {
      return neode.create('User', attrs).then((user) => user.toJson())
    }

    it('-', async () => {
      await expect(createUser({ slug: 'matt-rider' })).resolves.toMatchObject({
        slug: 'matt-rider',
      })
    })

    it('_', async () => {
      await expect(createUser({ slug: 'matt_rider' })).resolves.toMatchObject({
        slug: 'matt_rider',
      })
    })

    it(' ', async () => {
      await expect(createUser({ slug: 'matt rider' })).rejects.toThrow('ERROR_VALIDATION')
    })

    it('ä', async () => {
      await expect(createUser({ slug: 'mätt' })).rejects.toThrow('ERROR_VALIDATION')
    })
  })
})
