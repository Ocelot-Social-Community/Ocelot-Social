import path from 'node:path'

import { DeleteObjectCommand, ObjectCannedACL, S3Client } from '@aws-sdk/client-s3'
import { Upload } from '@aws-sdk/lib-storage'
import { UserInputError } from 'apollo-server-express'
import slug from 'slug'
import { v4 as uuid } from 'uuid'

import { isS3configured, S3Configured } from '@config/index'
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
    file: FileInput,
    fileAttributes?: object,
    opts?: AddAttachmentOpts,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ) => Promise<any>
}

export const attachments = (config: S3Configured) => {
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
    if (file) {
      let { pathname } = new URL(file.url, 'http://example.org') // dummy domain to avoid invalid URL error
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
    return file
  }

  const add: Attachments['add'] = async (
    resource,
    relationshipType,
    fileInput,
    fileAttributes = {},
    opts = {},
  ) => {
    const { transaction } = opts
    if (!transaction)
      return wrapTransaction(add, [resource, relationshipType, fileInput, fileAttributes], opts)

    const { upload } = fileInput
    if (!upload) throw new UserInputError('Cannot find attachment for given resource')

    const uploadFile = await upload
    const { name: fileName, ext } = path.parse(uploadFile.filename)
    const uniqueFilename = `${uuid()}-${slug(fileName)}${ext}`

    const s3Location = `attachments/${uniqueFilename}`
    const params = {
      Bucket,
      Key: s3Location,
      ACL: ObjectCannedACL.public_read,
      ContentType: uploadFile.mimetype,
      Body: uploadFile.createReadStream(),
    }
    const command = new Upload({ client: s3, params })
    const data = await command.done()
    const { Location } = data
    if (!Location) {
      throw new Error('File upload did not return `Location`')
    }

    let url = ''
    if (!S3_PUBLIC_GATEWAY) {
      url = Location
    } else {
      const publicLocation = new URL(S3_PUBLIC_GATEWAY)
      publicLocation.pathname = new URL(Location).pathname
      url = publicLocation.href
    }

    const { name, type } = fileInput
    const file = { url, name, type, ...fileAttributes }
    // const mimeType = uploadFile.mimetype.split('/')[0]
    // const nodeType = `Mime${mimeType.replace(/^./, mimeType[0].toUpperCase())}`
    // CREATE (file:${['File', nodeType].filter(Boolean).join(':')})
    const txResult = await transaction.run(
      `
      MATCH (resource {id: $resource.id})
      CREATE (file:File)
      SET file.createdAt = toString(datetime())
      SET file += $file
      SET file.updatedAt = toString(datetime())
      WITH resource, file
      MERGE (resource)-[:${relationshipType}]->(file)
      RETURN file {.*}
      `,
      { resource, file /*, nodeType */ },
    )
    const [uploadedFile] = txResult.records.map((record) => record.get('file') as File)
    return uploadedFile
  }

  const attachments: Attachments = {
    del,
    add,
  }
  return attachments
}
