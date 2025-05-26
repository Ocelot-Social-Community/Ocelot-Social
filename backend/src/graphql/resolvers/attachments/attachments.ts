import path from 'node:path'

import { UserInputError } from 'apollo-server-express'
import slug from 'slug'
import { v4 as uuid } from 'uuid'

import type { S3Config } from '@config/index'
import { getDriver } from '@db/neo4j'
import { s3Service } from '@src/uploads/s3Service'

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
  ) => Promise<File>

  add: (
    resource: { id: string },
    relationshipType: 'ATTACHMENT',
    file: FileInput,
    fileAttributes?: object,
    opts?: AddAttachmentOpts,
  ) => Promise<File>
}

const wrapTransactionDeleteAttachment = async (
  wrappedCallback: Attachments['del'],
  args: [resource: { id: string }, relationshipType: 'ATTACHMENT'],
  opts: DeleteAttachmentsOpts,
): ReturnType<Attachments['del']> => {
  const session = getDriver().session()
  try {
    const result = await session.writeTransaction((transaction) => {
      return wrappedCallback(...args, { ...opts, transaction })
    })
    return result
  } finally {
    await session.close()
  }
}

const wrapTransactionMergeAttachment = async (
  wrappedCallback: Attachments['add'],
  args: [
    resource: { id: string },
    relationshipType: 'ATTACHMENT',
    file: FileInput,
    fileAttributes?: object,
  ],
  opts: AddAttachmentOpts,
): ReturnType<Attachments['add']> => {
  const session = getDriver().session()
  try {
    const result = await session.writeTransaction((transaction) => {
      return wrappedCallback(...args, { ...opts, transaction })
    })
    return result
  } finally {
    await session.close()
  }
}

export const attachments = (config: S3Config) => {
  const s3 = s3Service(config, 'attachments')

  const del: Attachments['del'] = async (resource, relationshipType, opts = {}) => {
    const { transaction } = opts
    if (!transaction)
      return wrapTransactionDeleteAttachment(del, [resource, relationshipType], opts)
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
      await s3.deleteFile(file.url)
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
      return wrapTransactionMergeAttachment(
        add,
        [resource, relationshipType, fileInput, fileAttributes],
        opts,
      )

    const { upload } = fileInput
    if (!upload) throw new UserInputError('Cannot find attachment for given resource')

    const uploadFile = await upload
    const { name: fileName, ext } = path.parse(uploadFile.filename)
    const uniqueFilename = `${uuid()}-${slug(fileName)}${ext}`

    const url = await s3.uploadFile({
      ...uploadFile,
      uniqueFilename,
    })

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
