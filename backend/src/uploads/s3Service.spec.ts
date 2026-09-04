import { Readable } from 'node:stream'

import { describe, beforeEach, it, expect } from 'vitest'

import type { S3Config } from '@config/index'
import type { FileUpload } from 'graphql-upload'
import type { Mock } from 'vitest'

// Hoisted because `vi.mock`'s factory runs before the module body. One shared `send` for every
// constructed client is not a shortcut: the service caches a single S3Client for the whole
// process, so there is only ever one instance to stand in for.
const { sendMock } = vi.hoisted(() => ({ sendMock: vi.fn() }))

// `function`, not an arrow: these stand in for CLASSES and the code under test calls them with
// `new`. Vitest constructs the mock's implementation via Reflect.construct, and an arrow function
// is not a constructor — Jest got away with arrows because it applied the implementation instead.
// Only the two CLASSES are replaced; everything else stays the real module. That is what keeps
// the SDK's own constants out of this file — the mock previously restated `ObjectCannedACL` as
// `{ public_read: 'public_read' }` while the SDK's actual value is `'public-read'`, so the ACL
// assertion below was checking a string that S3 has never received.
vi.mock('@aws-sdk/client-s3', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  S3Client: vi.fn().mockImplementation(function () {
    return { send: sendMock }
  }),
  // Mirrors the real command shape (`command.input`) so a test can tell from what reached
  // `send()` alone which command was built and with which parameters.
  DeleteObjectCommand: vi.fn().mockImplementation(function (input: unknown) {
    return { input }
  }),
}))

vi.mock('@aws-sdk/lib-storage', () => {
  return {
    Upload: vi.fn(),
  }
})

// Dynamic imports: `vi.mock` above is hoisted, so these resolve to the mocked modules.
const { Upload } = await import('@aws-sdk/lib-storage')
const { S3Client, DeleteObjectCommand } = await import('@aws-sdk/client-s3')
const { s3Service } = await import('./s3Service')

// Cast, not vi.mocked(Upload): the real signature is a constructor taking the full SDK
// `Options`, while the stub only needs the one field the service passes and returns a `done()`.
interface UploadInput {
  params: { Bucket: string; Key: string; ContentType: string; Body: unknown }
}

// `Location` is optional here exactly as it is in the SDK's `CompleteMultipartUploadCommandOutput`
// — the service has a guard for the missing case, and a required type would make it untestable.
const uploadMock = Upload as unknown as Mock<
  (input: UploadInput) => { done: () => Promise<{ Location?: string }> }
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
      uploadMock.mockImplementation(function ({ params: { Key } }: UploadInput) {
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

    // Every object written through this service is world readable and cached for a week by CDNs
    // and browsers. Both are deliberate — images are served straight from the bucket — but they
    // are also invisible from the returned URL, so a silent change to either would only surface
    // as broken images (missing ACL) or as uncacheable traffic (missing CacheControl).
    it('marks the object public and long lived', async () => {
      const service = s3Service(config, 'ocelot-social')
      await service.uploadFile(input)

      // The literal wire values, not the SDK constant — asserting `ObjectCannedACL.public_read`
      // against a service that passes `ObjectCannedACL.public_read` would hold no matter what
      // that constant became. 'public-read' is what S3 itself has to receive.
      expect(uploadMock.mock.calls[0][0].params).toMatchObject({
        ACL: 'public-read',
        CacheControl: 'public, max-age=604800',
      })
    })

    // An empty prefix is a supported configuration. Concatenating unconditionally would yield the
    // key `/unique-filename.jpg`, and S3 treats the leading slash as a nameless folder — the file
    // would upload but never be found again under the name the database recorded.
    it('uses the bare filename as key when there is no prefix', async () => {
      const service = s3Service(config, '')
      await service.uploadFile(input)

      expect(uploadMock.mock.calls[0][0].params.Key).toBe('unique-filename.jpg')
    })

    describe('if the S3 service already returns an `https` location', () => {
      beforeEach(() => {
        uploadMock.mockImplementation(function ({ params: { Key } }: UploadInput) {
          return {
            done: async () =>
              Promise.resolve({ Location: `https://your-objectstorage.com/bucket/${Key}` }),
          }
        })
      })

      // The protocol fix-up must not fire here: prepending a second `https://` would produce
      // `https://https://…` and every image linking to it would 404.
      it('leaves the location untouched', async () => {
        const service = s3Service(config, 'ocelot-social')

        await expect(service.uploadFile(input)).resolves.toBe(
          'https://your-objectstorage.com/bucket/ocelot-social/unique-filename.jpg',
        )
      })
    })

    describe('if the S3 service returns no `Location` at all', () => {
      beforeEach(() => {
        uploadMock.mockImplementation(function () {
          return { done: async () => Promise.resolve({}) }
        })
      })

      // The caller persists the return value as the image URL. Without this guard the upload
      // would "succeed" and write `undefined` — later `https://undefined` — into the database,
      // where the damage is permanent and no longer traceable to the upload.
      it('fails the upload instead of returning an unusable URL', async () => {
        const service = s3Service(config, 'ocelot-social')

        await expect(service.uploadFile(input)).rejects.toThrow(
          'File upload did not return `Location`',
        )
      })
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
        uploadMock.mockImplementation(function ({ params: { Key } }: UploadInput) {
          return {
            done: async () => Promise.resolve({ Location: `your-objectstorage.com/bucket/${Key}` }),
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

  describe('client caching', () => {
    // The client owns a connection pool. Building a new one per call — the service is
    // instantiated on every request — would leak sockets until the process runs out of them.
    it('constructs the S3 client once for the whole process', () => {
      s3Service(config, 'ocelot-social')
      s3Service(config, 'other-prefix')

      expect(vi.mocked(S3Client)).toHaveBeenCalledTimes(1)
      expect(vi.mocked(S3Client).mock.calls[0][0]).toMatchObject({
        credentials: {
          accessKeyId: 'AWS_ACCESS_KEY_ID',
          secretAccessKey: 'AWS_SECRET_ACCESS_KEY',
        },
        endpoint: 'AWS_ENDPOINT',
        // Path style keeps the bucket in the URL path. Hetzner and MinIO have no per-bucket
        // DNS, so the virtual-host style default would not resolve at all.
        forcePathStyle: true,
      })
    })

    // Reusing the cached client under different credentials would silently write to whatever
    // account happened to configure the service first — a cross-tenant leak that no error
    // reports. Each field is checked on its own because dropping one from the comparison is the
    // realistic regression.
    it.each([
      ['AWS_ENDPOINT', 'https://other.endpoint'],
      ['AWS_ACCESS_KEY_ID', 'OTHER_KEY_ID'],
      ['AWS_SECRET_ACCESS_KEY', 'OTHER_SECRET'],
    ])('refuses to reuse the cached client when %s differs', (key, value) => {
      s3Service(config, 'ocelot-social')

      expect(() => s3Service({ ...config, [key]: value }, 'ocelot-social')).toThrow(
        'S3Client singleton was created with different credentials',
      )
    })

    // The bucket is a per-call parameter, not part of the client's identity, so serving two
    // buckets from the same credentials has to keep working.
    it('reuses the cached client for a different bucket', () => {
      s3Service(config, 'ocelot-social')

      expect(() =>
        s3Service({ ...config, AWS_BUCKET: 'OTHER_BUCKET' }, 'ocelot-social'),
      ).not.toThrow()
    })
  })

  describe('delete', () => {
    beforeEach(() => {
      sendMock.mockReset()
      vi.mocked(DeleteObjectCommand).mockClear()
    })

    // The URL comes back from the upload in path style, i.e. with the bucket as the first path
    // segment. Passing that straight through as the key would delete `AWS_BUCKET/ocelot-social/…`
    // — an object that does not exist — so S3 reports success while the file stays in the bucket
    // forever. That is the leak this stripping exists to prevent.
    it('strips the bucket segment out of a path style URL', async () => {
      const service = s3Service(config, 'ocelot-social')

      await service.deleteFile(
        'https://your-objectstorage.com/AWS_BUCKET/ocelot-social/unique-filename.jpg',
      )

      expect(sendMock).toHaveBeenCalledTimes(1)
      expect(sendMock.mock.calls[0][0]).toEqual({
        input: { Bucket: 'AWS_BUCKET', Key: 'ocelot-social/unique-filename.jpg' },
      })
    })

    // Virtual host style URLs carry the bucket in the hostname, where the path is already the
    // bare key. Stripping the first segment unconditionally would cut off the prefix instead.
    it('keeps the whole path when it does not start with the bucket', async () => {
      const service = s3Service(config, 'ocelot-social')

      await service.deleteFile('https://AWS_BUCKET.your-objectstorage.com/ocelot-social/file.jpg')

      expect(sendMock.mock.calls[0][0]).toEqual({
        input: { Bucket: 'AWS_BUCKET', Key: 'ocelot-social/file.jpg' },
      })
    })

    // Historic records store the location without a host. `new URL` rejects those outright, so
    // the parse needs its dummy base — otherwise deleting an old avatar throws a TypeError and
    // the surrounding mutation fails rather than the file being removed.
    it('accepts a location stored without a host', async () => {
      const service = s3Service(config, 'ocelot-social')

      await service.deleteFile('/AWS_BUCKET/ocelot-social/file.jpg')

      expect(sendMock.mock.calls[0][0]).toEqual({
        input: { Bucket: 'AWS_BUCKET', Key: 'ocelot-social/file.jpg' },
      })
    })

    // Awaiting the send is what turns a refused deletion into a failed mutation. Without it the
    // rejection would escape as an unhandled promise and the caller would drop the database
    // record while the object stays in the bucket.
    it('propagates a failure from the S3 client', async () => {
      const denied = new Error('AccessDenied')
      sendMock.mockRejectedValueOnce(denied)
      const service = s3Service(config, 'ocelot-social')

      await expect(service.deleteFile('/AWS_BUCKET/ocelot-social/file.jpg')).rejects.toThrow(denied)
    })
  })
})
