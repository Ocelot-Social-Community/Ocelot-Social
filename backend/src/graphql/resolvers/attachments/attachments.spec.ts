/* eslint-disable @typescript-eslint/require-await */

/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/restrict-template-expressions */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable promise/prefer-await-to-callbacks */
import { UserInputError } from 'apollo-server'

import Factory, { cleanDatabase } from '@db/factories'
import { getNeode, getDriver } from '@db/neo4j'
import type { S3Configured } from '@src/config'

import { attachments } from './attachments'

import type { FileInput } from './attachments'
import type { FileUpload } from 'graphql-upload'

const driver = getDriver()
const neode = getNeode()
const uuid = '[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}'

const config: S3Configured = {
  AWS_ACCESS_KEY_ID: 'AWS_ACCESS_KEY_ID',
  AWS_SECRET_ACCESS_KEY: 'AWS_SECRET_ACCESS_KEY',
  AWS_BUCKET: 'AWS_BUCKET',
  AWS_ENDPOINT: 'AWS_ENDPOINT',
  AWS_REGION: 'AWS_REGION',
  S3_PUBLIC_GATEWAY: undefined,
}

beforeAll(async () => {
  await cleanDatabase()
})

afterAll(async () => {
  await cleanDatabase()
  await driver.close()
})

/*  uploadCallback = jest.fn(
    ({ uniqueFilename }) => `http://your-objectstorage.com/bucket/${uniqueFilename}`,
  )
*/

// TODO: avoid database clean after each test in the future if possible for performance and flakyness reasons by filling the database step by step, see issue https://github.com/Ocelot-Social-Community/Ocelot-Social/issues/4543
afterEach(async () => {
  await cleanDatabase()
})

describe('delete Attachment', () => {
  const { del: deleteAttachment } = attachments(config)
  describe('given a resource with an attachment', () => {
    let user: { id: string }
    beforeEach(async () => {
      const u = await Factory.build(
        'message',
        {},
        {
          files: [
            Factory.build('file', {
              url: 'http://localhost/some/file/url/',
              name: 'This is a file attached to a message',
              type: 'application/dummy',
            }),
          ],
        },
      )
      user = await u.toJson()
    })

    it('deletes `File` node', async () => {
      await expect(neode.all('File')).resolves.toHaveLength(1)
      await deleteAttachment(user, 'ATTACHMENT')
      await expect(neode.all('File')).resolves.toHaveLength(0)
    })

    describe('given a transaction parameter', () => {
      it('executes cypher statements within the transaction', async () => {
        const session = driver.session()
        let someString: string
        try {
          someString = await session.writeTransaction(async (transaction) => {
            await deleteAttachment(user, 'ATTACHMENT', {
              transaction,
            })
            const txResult = await transaction.run('RETURN "Hello" as result')
            const [result] = txResult.records.map((record) => record.get('result'))
            return result
          })
        } finally {
          await session.close()
        }
        await expect(neode.all('Image')).resolves.toHaveLength(0)
        expect(someString).toEqual('Hello')
      })

      it('rolls back the transaction in case of errors', async () => {
        await expect(neode.all('Image')).resolves.toHaveLength(1)
        const session = driver.session()
        try {
          await session.writeTransaction(async (transaction) => {
            await deleteAttachment(user, 'ATTACHMENT', {
              transaction,
            })
            throw new Error('Ouch!')
          })
          // eslint-disable-next-line no-catch-all/no-catch-all
        } catch (err) {
          // nothing has been deleted
          await expect(neode.all('Image')).resolves.toHaveLength(1)
          // all good
        } finally {
          await session.close()
        }
      })
    })
  })
})

describe('add Attachment', () => {
  const { add: addAttachment } = attachments(config)
  let fileInput: FileInput
  let post: { id: string }
  beforeEach(() => {
    fileInput = {
      name: 'The name of the new attachment',
      type: 'application/any',
    }
  })

  describe('given file.upload', () => {
    beforeEach(() => {
      const createReadStream: FileUpload['createReadStream'] = (() => ({
        pipe: () => ({
          on: (_, callback) => callback(),
        }),
      })) as unknown as FileUpload['createReadStream']
      fileInput = {
        ...fileInput,
        upload: Promise.resolve({
          filename: 'image.jpg',
          mimetype: 'image/jpeg',
          encoding: '7bit',
          createReadStream,
        }),
      }
    })

    describe('on existing resource', () => {
      beforeEach(async () => {
        const p = await Factory.build(
          'post',
          { id: 'p99' },
          {
            author: Factory.build('user', {}, { avatar: null }),
            image: null,
          },
        )
        post = await p.toJson()
      })

      it('returns new image', async () => {
        await expect(addAttachment(post, 'ATTACHMENT', fileInput)).resolves.toMatchObject({
          url: expect.any(String),
          alt: 'A description of the new image',
        })
      })

      it('creates `:Image` node', async () => {
        await expect(neode.all('File')).resolves.toHaveLength(0)
        await addAttachment(post, 'ATTACHMENT', fileInput)
        await expect(neode.all('File')).resolves.toHaveLength(1)
      })

      it('creates a url safe name', async () => {
        if (!fileInput.upload) {
          throw new Error('Test imageInput was not setup correctly.')
        }
        const upload = await fileInput.upload
        upload.filename = '/path/to/awkward?/ file-location/?foo- bar-avatar.jpg'
        fileInput.upload = Promise.resolve(upload)
        await expect(addAttachment(post, 'ATTACHMENT', fileInput)).resolves.toMatchObject({
          url: expect.stringMatching(
            new RegExp(`^http://your-objectstorage.com/bucket/${uuid}-foo-bar-avatar.jpg`),
          ),
        })
      })

      describe('given a `S3_PUBLIC_GATEWAY` configuration', () => {
        const { add: addAttachment } = attachments({
          ...config,
          S3_PUBLIC_GATEWAY: 'http://s3-public-gateway.com',
        })

        it('changes the domain of the URL to a server that could e.g. apply image transformations', async () => {
          if (!fileInput.upload) {
            throw new Error('Test imageInput was not setup correctly.')
          }
          const upload = await fileInput.upload
          upload.filename = '/path/to/file-location/foo-bar-avatar.jpg'
          fileInput.upload = Promise.resolve(upload)
          await expect(addAttachment(post, 'ATTACHMENT', fileInput)).resolves.toMatchObject({
            url: expect.stringMatching(
              new RegExp(`^http://s3-public-gateway.com/bucket/${uuid}-foo-bar-avatar.jpg`),
            ),
          })
        })
      })

      it('connects resource with image via given image type', async () => {
        await addAttachment(post, 'ATTACHMENT', fileInput)
        const result = await neode.cypher(
          `MATCH(p:Post {id: "p99"})-[:HERO_IMAGE]->(i:Image) RETURN i,p`,
          {},
        )
        post = neode.hydrateFirst<{ id: string }>(result, 'p', neode.model('Post')).properties()
        const image = neode.hydrateFirst(result, 'i', neode.model('Image'))
        expect(post).toBeTruthy()
        expect(image).toBeTruthy()
      })

      it('sets metadata', async () => {
        await addAttachment(post, 'ATTACHMENT', fileInput)
        const image = await neode.first<typeof Image>('Image', {}, undefined)
        await expect(image.toJson()).resolves.toMatchObject({
          alt: 'A description of the new image',
          createdAt: expect.any(String),
          url: expect.any(String),
        })
      })

      describe('given a transaction parameter', () => {
        it('executes cypher statements within the transaction', async () => {
          const session = driver.session()
          try {
            await session.writeTransaction(async (transaction) => {
              const image = await addAttachment(post, 'ATTACHMENT', fileInput, {
                transaction,
              })
              return transaction.run(
                `
                MATCH(image:Image {url: $image.url})
                SET image.alt = 'This alt text gets overwritten'
                RETURN image {.*}
              `,
                { image },
              )
            })
          } finally {
            await session.close()
          }
          const image = await neode.first<typeof Image>(
            'Image',
            { alt: 'This alt text gets overwritten' },
            undefined,
          )
          await expect(image.toJson()).resolves.toMatchObject({
            alt: 'This alt text gets overwritten',
          })
        })

        it('rolls back the transaction in case of errors', async () => {
          const session = driver.session()
          try {
            await session.writeTransaction(async (transaction) => {
              const image = await addAttachment(post, 'ATTACHMENT', fileInput, {
                transaction,
              })
              return transaction.run('Ooops invalid cypher!', { image })
            })
            // eslint-disable-next-line no-catch-all/no-catch-all
          } catch (err) {
            // nothing has been created
            await expect(neode.all('Image')).resolves.toHaveLength(0)
            // all good
          } finally {
            await session.close()
          }
        })
      })

      describe('if resource has an image already', () => {
        beforeEach(async () => {
          const [post, image] = await Promise.all([
            neode.find('Post', 'p99'),
            Factory.build('image'),
          ])
          await post.relateTo(image, 'image')
        })

        it('updates metadata of existing image node', async () => {
          await expect(neode.all('Image')).resolves.toHaveLength(1)
          await addAttachment(post, 'ATTACHMENT', fileInput)
          await expect(neode.all('Image')).resolves.toHaveLength(1)
          const image = await neode.first<typeof Image>('Image', {}, undefined)
          await expect(image.toJson()).resolves.toMatchObject({
            alt: 'A description of the new image',
            createdAt: expect.any(String),
            url: expect.any(String),
            // TODO
            // width:
            // height:
          })
        })
      })
    })
  })

  describe('without image.upload', () => {
    it('throws UserInputError', async () => {
      const p = await Factory.build('post', { id: 'p99' }, { image: null })
      post = await p.toJson()
      await expect(addAttachment(post, 'ATTACHMENT', fileInput)).rejects.toEqual(
        new UserInputError('Cannot find image for given resource'),
      )
    })

    describe('if resource has an image already', () => {
      beforeEach(async () => {
        const p = await Factory.build(
          'post',
          {
            id: 'p99',
          },
          {
            author: Factory.build(
              'user',
              {},
              {
                avatar: null,
              },
            ),
            image: Factory.build('image', {
              alt: 'This is the previous, not updated image',
              url: 'http://localhost/some/original/url',
            }),
          },
        )
        post = await p.toJson()
      })

      it('updates metadata', async () => {
        await addAttachment(post, 'ATTACHMENT', fileInput)
        const images = await neode.all('Image')
        expect(images).toHaveLength(1)
        await expect(images.first().toJson()).resolves.toMatchObject({
          createdAt: expect.any(String),
          url: expect.any(String),
          alt: 'A description of the new image',
        })
      })
    })
  })
})
