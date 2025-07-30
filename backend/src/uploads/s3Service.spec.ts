import { Upload } from '@aws-sdk/lib-storage'

import type { S3Config } from '@config/index'

import { s3Service } from './s3Service'

import type { FileUpload } from 'graphql-upload'

jest.mock('@aws-sdk/client-s3', () => {
  return {
    S3Client: jest.fn().mockImplementation(() => ({
      send: jest.fn(),
    })),
    ObjectCannedACL: { public_read: 'public_read' },
    DeleteObjectCommand: jest.fn().mockImplementation(() => ({})),
  }
})

jest.mock('@aws-sdk/lib-storage', () => {
  return {
    Upload: jest.fn(),
  }
})

const uploadMock = Upload as unknown as jest.Mock

const createReadStream: FileUpload['createReadStream'] = (() => ({
  pipe: () => ({
    on: (_: unknown, callback: () => void) => callback(), // eslint-disable-line promise/prefer-await-to-callbacks
  }),
})) as unknown as FileUpload['createReadStream']
const input = {
  uniqueFilename: 'unique-filename.jpg',
  mimetype: 'image/jpeg',
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
    describe('if the S3 service returns a valid URL as a `Location`', () => {
      beforeEach(() => {
        uploadMock.mockImplementation(({ params: { Key } }: { params: { Key: string } }) => ({
          done: () => Promise.resolve({ Location: `http://your-objectstorage.com/bucket/${Key}` }),
        }))
      })

      it('returns the `Location` that was returned by the s3 client library', async () => {
        const service = s3Service(config, 'ocelot-social')
        await expect(service.uploadFile(input)).resolves.toEqual(
          'http://your-objectstorage.com/bucket/ocelot-social/unique-filename.jpg',
        )
      })
    })

    describe('but if for some reason, the S3 service returns a `Location` wich is not a valid URL and misses the protocol part', () => {
      beforeEach(() => {
        uploadMock.mockImplementation(({ params: { Key } }: { params: { Key: string } }) => ({
          done: () => Promise.resolve({ Location: `your-objectstorage.com/bucket/${Key}` }),
        }))
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
