import { describe, expect, it } from 'vitest'

import type { S3Config } from '@config/index'

// `function`, not an arrow: the code under test constructs these with `new` (see
// s3Service.spec.ts). The commands keep their input, so a test can tell from what reached
// `send()` which command was sent and with what.
const { sendMock, clients } = vi.hoisted(() => ({
  sendMock: vi.fn(),
  clients: [] as unknown[],
}))

vi.mock('@aws-sdk/client-s3', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  S3Client: vi.fn().mockImplementation(function (options: unknown) {
    clients.push(options)
    return { send: sendMock }
  }),
  ListObjectVersionsCommand: vi.fn().mockImplementation(function (input: unknown) {
    return { list: input }
  }),
  DeleteObjectsCommand: vi.fn().mockImplementation(function (input: unknown) {
    return { delete: input }
  }),
}))

const { emptyBucket } = await import('./emptyBucket')

const config = {
  AWS_ACCESS_KEY_ID: 'minio',
  AWS_SECRET_ACCESS_KEY: '12341234',
  AWS_ENDPOINT: 'http://localhost:9000',
  AWS_REGION: 'local',
  AWS_BUCKET: 'ocelot',
} as S3Config

const sent = () => sendMock.mock.calls.map(([command]) => command as unknown)

const firstPage = { Bucket: 'ocelot', KeyMarker: undefined, VersionIdMarker: undefined }

describe('emptyBucket', () => {
  it('deletes every page of a bucket without versioning, and counts its files', async () => {
    sendMock
      .mockResolvedValueOnce({
        Versions: [{ Key: 'a.jpg', VersionId: 'null' }, { Key: 'b.jpg', VersionId: 'null' }, {}],
        IsTruncated: true,
        NextKeyMarker: 'b.jpg',
        NextVersionIdMarker: 'null',
      })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ Versions: [{ Key: 'c.jpg', VersionId: 'null' }] })
      .mockResolvedValueOnce({ Errors: [] })

    await expect(emptyBucket(config)).resolves.toBe(3)
    expect(sent()).toEqual([
      { list: firstPage },
      {
        delete: {
          Bucket: 'ocelot',
          Delete: {
            Objects: [
              { Key: 'a.jpg', VersionId: 'null' },
              { Key: 'b.jpg', VersionId: 'null' },
            ],
            Quiet: true,
          },
        },
      },
      { list: { Bucket: 'ocelot', KeyMarker: 'b.jpg', VersionIdMarker: 'null' } },
      {
        delete: {
          Bucket: 'ocelot',
          Delete: { Objects: [{ Key: 'c.jpg', VersionId: 'null' }], Quiet: true },
        },
      },
    ])
    expect(clients.at(-1)).toEqual({
      credentials: { accessKeyId: 'minio', secretAccessKey: '12341234' },
      endpoint: 'http://localhost:9000',
      region: 'local',
      forcePathStyle: true,
    })
  })

  it('deletes every version and delete marker of a versioned bucket for good', async () => {
    sendMock
      .mockResolvedValueOnce({
        Versions: [
          { Key: 'a.jpg', VersionId: 'v2', IsLatest: true },
          { Key: 'a.jpg', VersionId: 'v1', IsLatest: false },
        ],
        DeleteMarkers: [{ Key: 'b.jpg', VersionId: 'm1' }, {}],
        IsTruncated: false,
      })
      .mockResolvedValueOnce({})

    // The versions held data; the marker did not.
    await expect(emptyBucket(config)).resolves.toBe(2)
    expect(sent()[1]).toEqual({
      delete: {
        Bucket: 'ocelot',
        Delete: {
          Objects: [
            { Key: 'a.jpg', VersionId: 'v2' },
            { Key: 'a.jpg', VersionId: 'v1' },
            { Key: 'b.jpg', VersionId: 'm1' },
          ],
          Quiet: true,
        },
      },
    })
  })

  it('sends no deletion for an empty bucket', async () => {
    sendMock.mockResolvedValueOnce({ IsTruncated: false })

    await expect(emptyBucket(config)).resolves.toBe(0)
    expect(sent()).toEqual([{ list: firstPage }])
  })

  it('counts nothing for a page of delete markers alone', async () => {
    sendMock
      .mockResolvedValueOnce({ DeleteMarkers: [{ Key: 'b.jpg', VersionId: 'm1' }] })
      .mockResolvedValueOnce({})

    await expect(emptyBucket(config)).resolves.toBe(0)
  })

  it('fails when files could not be deleted, instead of reporting them gone', async () => {
    sendMock
      .mockResolvedValueOnce({ Versions: [{ Key: 'a.jpg' }, { Key: 'b.jpg' }] })
      .mockResolvedValueOnce({
        Errors: [
          { Key: 'a.jpg', Message: 'Access Denied' },
          { Key: 'b.jpg', Message: 'Access Denied' },
        ],
      })

    await expect(emptyBucket(config)).rejects.toThrow(
      'Could not delete 2 file(s) from bucket ocelot, e.g. a.jpg: Access Denied',
    )
  })

  it('still says that it failed when the storage names neither the file nor the reason', async () => {
    sendMock
      .mockResolvedValueOnce({ Versions: [{ Key: 'a.jpg' }] })
      .mockResolvedValueOnce({ Errors: [{}] })

    await expect(emptyBucket(config)).rejects.toThrow(
      'Could not delete 1 file(s) from bucket ocelot, e.g. ?: no reason given',
    )
  })
})
