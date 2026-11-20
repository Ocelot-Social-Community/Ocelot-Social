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
  ListObjectsV2Command: vi.fn().mockImplementation(function (input: unknown) {
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

describe('emptyBucket', () => {
  it('deletes every page of the bucket and counts what went', async () => {
    sendMock
      .mockResolvedValueOnce({
        Contents: [{ Key: 'a.jpg' }, { Key: 'b.jpg' }, {}],
        IsTruncated: true,
        NextContinuationToken: 'next',
      })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ Contents: [{ Key: 'c.jpg' }], IsTruncated: false })
      .mockResolvedValueOnce({ Errors: [] })

    await expect(emptyBucket(config)).resolves.toBe(3)
    expect(sent()).toEqual([
      { list: { Bucket: 'ocelot', ContinuationToken: undefined } },
      {
        delete: {
          Bucket: 'ocelot',
          Delete: { Objects: [{ Key: 'a.jpg' }, { Key: 'b.jpg' }], Quiet: true },
        },
      },
      { list: { Bucket: 'ocelot', ContinuationToken: 'next' } },
      { delete: { Bucket: 'ocelot', Delete: { Objects: [{ Key: 'c.jpg' }], Quiet: true } } },
    ])
    expect(clients.at(-1)).toEqual({
      credentials: { accessKeyId: 'minio', secretAccessKey: '12341234' },
      endpoint: 'http://localhost:9000',
      region: 'local',
      forcePathStyle: true,
    })
  })

  it('sends no deletion for an empty bucket', async () => {
    sendMock.mockResolvedValueOnce({ IsTruncated: false })

    await expect(emptyBucket(config)).resolves.toBe(0)
    expect(sent()).toEqual([{ list: { Bucket: 'ocelot', ContinuationToken: undefined } }])
  })

  it('fails when files could not be deleted, instead of reporting them gone', async () => {
    sendMock
      .mockResolvedValueOnce({ Contents: [{ Key: 'a.jpg' }, { Key: 'b.jpg' }] })
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
      .mockResolvedValueOnce({ Contents: [{ Key: 'a.jpg' }] })
      .mockResolvedValueOnce({ Errors: [{}] })

    await expect(emptyBucket(config)).rejects.toThrow(
      'Could not delete 1 file(s) from bucket ocelot, e.g. ?: no reason given',
    )
  })
})
