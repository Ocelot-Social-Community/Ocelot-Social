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

import { images } from './imagesLocal'

import type { ImageInput } from './images'
import type { FileUpload } from 'graphql-upload'

const driver = getDriver()
const neode = getNeode()
const uuid = '[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}'
let uploadCallback
let deleteCallback

beforeAll(async () => {
  await cleanDatabase()
})

afterAll(async () => {
  await cleanDatabase()
  await driver.close()
})

beforeEach(async () => {
  uploadCallback = jest.fn(({ uniqueFilename }) => `/uploads/${uniqueFilename}`)
  deleteCallback = jest.fn()
})

// TODO: avoid database clean after each test in the future if possible for performance and flakyness reasons by filling the database step by step, see issue https://github.com/Ocelot-Social-Community/Ocelot-Social/issues/4543
afterEach(async () => {
  await cleanDatabase()
})

describe('deleteImage', () => {
  const { deleteImage } = images

  describe('given a resource with an image', () => {
    let user: { id: string }
    beforeEach(async () => {
      const u = await Factory.build(
        'user',
        {},
        {
          avatar: Factory.build('image', {
            url: 'http://localhost/some/avatar/url/',
            alt: 'This is the avatar image of a user',
          }),
        },
      )
      user = await u.toJson()
    })

    it('deletes `Image` node', async () => {
      await expect(neode.all('Image')).resolves.toHaveLength(1)
      await deleteImage(user, 'AVATAR_IMAGE', { deleteCallback })
      await expect(neode.all('Image')).resolves.toHaveLength(0)
    })

    it('calls deleteCallback', async () => {
      const u = await Factory.build('user')
      user = await u.toJson()
      await deleteImage(user, 'AVATAR_IMAGE', { deleteCallback })
      expect(deleteCallback).toHaveBeenCalled()
    })

    describe('given a transaction parameter', () => {
      it('executes cypher statements within the transaction', async () => {
        const session = driver.session()
        let someString: string
        try {
          someString = await session.writeTransaction(async (transaction) => {
            await deleteImage(user, 'AVATAR_IMAGE', {
              deleteCallback,
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
            await deleteImage(user, 'AVATAR_IMAGE', {
              deleteCallback,
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

describe('mergeImage', () => {
  const { mergeImage } = images
  let imageInput: ImageInput
  let post: { id: string }
  beforeEach(() => {
    imageInput = {
      alt: 'A description of the new image',
    }
  })

  describe('given image.upload', () => {
    beforeEach(() => {
      const createReadStream: FileUpload['createReadStream'] = (() => ({
        pipe: () => ({
          on: (_, callback) => callback(),
        }),
      })) as unknown as FileUpload['createReadStream']
      imageInput = {
        ...imageInput,
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
        await expect(
          mergeImage(post, 'HERO_IMAGE', imageInput, { uploadCallback, deleteCallback }),
        ).resolves.toMatchObject({
          url: expect.any(String),
          alt: 'A description of the new image',
        })
      })

      it('calls upload callback', async () => {
        await mergeImage(post, 'HERO_IMAGE', imageInput, { uploadCallback, deleteCallback })
        expect(uploadCallback).toHaveBeenCalled()
      })

      it('creates `:Image` node', async () => {
        await expect(neode.all('Image')).resolves.toHaveLength(0)
        await mergeImage(post, 'HERO_IMAGE', imageInput, { uploadCallback, deleteCallback })
        await expect(neode.all('Image')).resolves.toHaveLength(1)
      })

      it('creates a url safe name', async () => {
        if (!imageInput.upload) {
          throw new Error('Test imageInput was not setup correctly.')
        }
        const upload = await imageInput.upload
        upload.filename = '/path/to/awkward?/ file-location/?foo- bar-avatar.jpg'
        imageInput.upload = Promise.resolve(upload)
        await expect(
          mergeImage(post, 'HERO_IMAGE', imageInput, { uploadCallback, deleteCallback }),
        ).resolves.toMatchObject({
          url: expect.stringMatching(new RegExp(`^/uploads/${uuid}-foo-bar-avatar.jpg`)),
        })
      })

      it('connects resource with image via given image type', async () => {
        await mergeImage(post, 'HERO_IMAGE', imageInput, { uploadCallback, deleteCallback })
        const result = await neode.cypher(
          `MATCH(p:Post {id: "p99"})-[:HERO_IMAGE]->(i:Image) RETURN i,p`,
          {},
        )
        post = neode.hydrateFirst<{ id: string }>(result, 'p', neode.model('Post')).properties()
        const image = neode.hydrateFirst(result, 'i', neode.model('Image'))
        expect(post).toBeTruthy()
        expect(image).toBeTruthy()
      })

      it('whitelists relationship types', async () => {
        await expect(
          mergeImage(post, 'WHATEVER' as 'HERO_IMAGE', imageInput, {
            uploadCallback,
            deleteCallback,
          }),
        ).rejects.toEqual(new Error('Unknown relationship type WHATEVER'))
      })

      it('sets metadata', async () => {
        await mergeImage(post, 'HERO_IMAGE', imageInput, { uploadCallback, deleteCallback })
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
              const image = await mergeImage(post, 'HERO_IMAGE', imageInput, {
                uploadCallback,
                deleteCallback,
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
              const image = await mergeImage(post, 'HERO_IMAGE', imageInput, {
                uploadCallback,
                deleteCallback,
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

        it('calls deleteCallback', async () => {
          await mergeImage(post, 'HERO_IMAGE', imageInput, { uploadCallback, deleteCallback })
          expect(deleteCallback).toHaveBeenCalled()
        })

        it('calls uploadCallback', async () => {
          await mergeImage(post, 'HERO_IMAGE', imageInput, { uploadCallback, deleteCallback })
          expect(uploadCallback).toHaveBeenCalled()
        })

        it('updates metadata of existing image node', async () => {
          await expect(neode.all('Image')).resolves.toHaveLength(1)
          await mergeImage(post, 'HERO_IMAGE', imageInput, { uploadCallback, deleteCallback })
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
      await expect(mergeImage(post, 'HERO_IMAGE', imageInput)).rejects.toEqual(
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

      it('does not call deleteCallback', async () => {
        await mergeImage(post, 'HERO_IMAGE', imageInput, { uploadCallback, deleteCallback })
        expect(deleteCallback).not.toHaveBeenCalled()
      })

      it('does not call uploadCallback', async () => {
        await mergeImage(post, 'HERO_IMAGE', imageInput, { uploadCallback, deleteCallback })
        expect(uploadCallback).not.toHaveBeenCalled()
      })

      it('updates metadata', async () => {
        await mergeImage(post, 'HERO_IMAGE', imageInput, { uploadCallback, deleteCallback })
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
