import type { Mock } from 'vitest'
import { Readable } from 'node:stream'


import type { S3Config } from '@config/index'
import type { FileUpload } from 'graphql-upload'

// `function`, not an arrow: these stand in for CLASSES and the code under test calls them with
// `new`. Vitest constructs the mock's implementation via Reflect.construct, and an arrow function
// is not a constructor — Jest got away with arrows because it applied the implementation instead.
vi.mock('@aws-sdk/client-s3', () => {
  return {
    S3Client: vi.fn().mockImplementation(function () {
      return { send: vi.fn() }
    }),
    ObjectCannedACL: { public_read: 'public_read' },
    DeleteObjectCommand: vi.fn().mockImplementation(function () {
      return {}
    }),
  }
})

vi.mock('@aws-sdk/lib-storage', () => {
  return {
    Upload: vi.fn(),
  }
})

// Imported after the mock registrations, not above them: `unstable_mockModule`
// does not hoist, so a static import would bind the real module first.
const { Upload } = await import('@aws-sdk/lib-storage')
const { s3Service } = await import('./s3Service')

interface UploadInput {
  params: { Bucket: string; Key: string; ContentType: string; Body: unknown }
}
const uploadMock = Upload as unknown as Mock<
  (input: UploadInput) => { done: () => Promise<{ Location: string }> }
>

// `Upload` is mocked, so the stream is only handed over as `Body` and never consumed.
// It is still a real readable stream so the mock honours the `Body` contract.
const createReadStream: FileUpload['createReadStream'] = () => Readable.from([])
const input = {
  uniqueFilename: 'unique-filename.jpg',
  mimetype: 'image/jpeg',
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  createReadStream,
}

const config: S3Config = {
  AWS_ACCESS_KEY_ID: 'AWS_ACCESS_KEY_ID',
  AWS_SECRET_ACCESS_KEY: 'AWS_SECRET_ACCESS_KEY',
  AWS_BUCKET: 'AWS_BUCKET',
  AWS_ENDPOINT: 'AWS_ENDPOINT',
  AWS_REGION: 'AWS_REGION',
  IMAGOR_SECRET: 'IMAGOR_SECRET',
  IMAGOR_PUBLIC_URL: 'IMAGOR_PUBLIC_URL',
}

describe('s3Service', () => {
  describe('upload', () => {
    beforeEach(() => {
      uploadMock.mockReset()
      uploadMock.mockImplementation(function ({ params: { Key } }) {
        return {
          done: async () =>
            Promise.resolve({ Location: `http://your-objectstorage.com/bucket/${Key}` }),
        }
      })
    })

    it('hands the file to the s3 client library as a readable `Body`', async () => {
      const service = s3Service(config, 'ocelot-social')
      await service.uploadFile(input)
      const { params } = uploadMock.mock.calls[0][0]
      expect(params).toMatchObject({
        Bucket: 'AWS_BUCKET',
        Key: 'ocelot-social/unique-filename.jpg',
        ContentType: 'image/jpeg',
      })
      expect(params.Body).toBeInstanceOf(Readable)
    })

    describe('if the S3 service returns a valid URL as a `Location`', () => {
      it('returns the `Location` that was returned by the s3 client library', async () => {
        const service = s3Service(config, 'ocelot-social')
        await expect(service.uploadFile(input)).resolves.toEqual(
          'http://your-objectstorage.com/bucket/ocelot-social/unique-filename.jpg',
        )
      })
    })

    describe('but if for some reason, the S3 service returns a `Location` wich is not a valid URL and misses the protocol part', () => {
      beforeEach(() => {
        uploadMock.mockImplementation(function ({ params: { Key } }) {
          return {
            done: async () =>
              Promise.resolve({ Location: `your-objectstorage.com/bucket/${Key}` }),
          }
        })
      })

      it('adds `https:` as protocol', async () => {
        const service = s3Service(config, 'ocelot-social')
        await expect(service.uploadFile(input)).resolves.toEqual(
          'https://your-objectstorage.com/bucket/ocelot-social/unique-filename.jpg',
        )
      })
    })
  })
})
