import path from 'node:path'

import { DeleteObjectCommand, ObjectCannedACL, S3Client } from '@aws-sdk/client-s3'
import { Upload } from '@aws-sdk/lib-storage'
import { UserInputError } from 'apollo-server-express'
import slug from 'slug'
import { v4 as uuid } from 'uuid'

import CONFIG, { isS3configured } from '@config/index'
import { wrapTransaction } from '@graphql/resolvers/images/wrapTransaction'

import type { FileUpload } from 'graphql-upload'
import type { Transaction } from 'neo4j-driver'

export type FileDeleteCallback = (url: string) => Promise<void>

export type FileUploadCallback = (
  upload: Pick<FileUpload, 'createReadStream' | 'mimetype'> & { uniqueFilename: string },
) => Promise<string>
export interface DeleteAttachmentsOpts {
  transaction?: Transaction
}

export interface AddAttachmentOpts {
  transaction?: Transaction
}

export interface FileInput {
  upload?: Promise<FileUpload>
  name: string
  type: string
}

export interface File {
  url: string
  name: string
  type: string
}

export interface Attachments {
  del: (
    resource: { id: string },
    relationshipType: 'ATTACHMENT',
    opts?: DeleteAttachmentsOpts,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ) => Promise<any>

  add: (
    resource: { id: string },
    relationshipType: 'ATTACHMENT',
    file: FileInput | null,
    fileAttributes?: object,
    opts?: AddAttachmentOpts,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ) => Promise<any>
}

export const attachments = (config: typeof CONFIG) => {
  if (!isS3configured(config)) {
    throw new Error('S3 not configured')
  }

  const { AWS_BUCKET: Bucket, S3_PUBLIC_GATEWAY } = config

  const { AWS_ENDPOINT, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY } = config
  const s3 = new S3Client({
    credentials: {
      accessKeyId: AWS_ACCESS_KEY_ID,
      secretAccessKey: AWS_SECRET_ACCESS_KEY,
    },
    endpoint: AWS_ENDPOINT,
    forcePathStyle: true,
  })

  const del: Attachments['del'] = async (resource, relationshipType, opts = {}) => {
    const { transaction } = opts
    if (!transaction) return wrapTransaction(del, [resource, relationshipType], opts)
    const txResult = await transaction.run(
      `
      MATCH (resource {id: $resource.id})-[rel:${relationshipType}]->(file:File)
      WITH file, file {.*} as fileProps
      DETACH DELETE file
      RETURN fileProps
    `,
      { resource },
    )
    const [file] = txResult.records.map((record) => record.get('fileProps') as File)
    // This behaviour differs from `mergeImage`. If you call `mergeImage`
    // with metadata for an image that does not exist, it's an indicator
    // of an error (so throw an error). If we bulk delete an image, it
    // could very well be that there is no image for the resource.
    if (file) {
      await s3Delete(file.url)
    }
    return file
  }

  const add: Attachments['add'] = async (
    resource,
    relationshipType,
    fileInput,
    fileAttributes = {},
    opts = {},
  ) => {
    if (fileInput === null) return del(resource, relationshipType, opts)
    const { transaction } = opts
    if (!transaction)
      return wrapTransaction(add, [resource, relationshipType, fileInput, fileAttributes], opts)

    let txResult = await transaction.run(
      `
      MATCH (resource {id: $resource.id})-[:${relationshipType}]->(file:File)
      RETURN file {.*}
      `,
      { resource },
    )
    const [existingFile] = txResult.records.map((record) => record.get('file') as File)
    const { upload } = fileInput
    if (!(existingFile || upload))
      throw new UserInputError('Cannot find attachment for given resource')
    if (existingFile && upload) {
      await s3Delete(existingFile.url)
    }
    const url = await uploadFile(upload)
    const { name, type } = fileInput
    const file = { url, name, type, ...fileAttributes }
    txResult = await transaction.run(
      `
      MATCH (resource {id: $resource.id})
      MERGE (resource)-[:${relationshipType}]->(file:File)
      ON CREATE SET file.createdAt = toString(datetime())
      ON MATCH SET file.updatedAt = toString(datetime())
      SET file += $file
      RETURN file {.*}
      `,
      { resource, file },
    )
    const [mergedFile] = txResult.records.map((record) => record.get('file') as File)
    return mergedFile
  }

  const uploadFile = async (uploadPromise: Promise<FileUpload> | undefined) => {
    if (!uploadPromise) return undefined
    const upload = await uploadPromise
    const { name, ext } = path.parse(upload.filename)
    const uniqueFilename = `${uuid()}-${slug(name)}${ext}`
    const Location = await s3Upload({ ...upload, uniqueFilename })
    if (!S3_PUBLIC_GATEWAY) {
      return Location
    }
    const publicLocation = new URL(S3_PUBLIC_GATEWAY)
    publicLocation.pathname = new URL(Location).pathname
    return publicLocation.href
  }

  const s3Upload: FileUploadCallback = async ({ createReadStream, uniqueFilename, mimetype }) => {
    const s3Location = `attachments/${uniqueFilename}`
    const params = {
      Bucket,
      Key: s3Location,
      ACL: ObjectCannedACL.public_read,
      ContentType: mimetype,
      Body: createReadStream(),
    }
    const command = new Upload({ client: s3, params })
    const data = await command.done()
    const { Location } = data
    if (!Location) {
      throw new Error('File upload did not return `Location`')
    }
    return Location
  }

  const s3Delete: FileDeleteCallback = async (url) => {
    let { pathname } = new URL(url, 'http://example.org') // dummy domain to avoid invalid URL error
    pathname = pathname.substring(1) // remove first character '/'
    const prefix = `${Bucket}/`
    if (pathname.startsWith(prefix)) {
      pathname = pathname.slice(prefix.length)
    }
    const params = {
      Bucket,
      Key: pathname,
    }
    await s3.send(new DeleteObjectCommand(params))
  }

  const attachments: Attachments = {
    del,
    add,
  }
  return attachments
}
