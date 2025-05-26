/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/restrict-template-expressions */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable promise/avoid-new */
/* eslint-disable security/detect-non-literal-fs-filename */

import { existsSync, unlinkSync, createWriteStream } from 'node:fs'
import path from 'node:path'

import { S3Client, DeleteObjectCommand, ObjectCannedACL } from '@aws-sdk/client-s3'
import { Upload } from '@aws-sdk/lib-storage'
import { UserInputError } from 'apollo-server'
import slug from 'slug'
import { v4 as uuid } from 'uuid'

import CONFIG from '@config/index'
import { getDriver } from '@db/neo4j'

import type { FileUpload } from 'graphql-upload'
import type { Transaction } from 'neo4j-driver'

type FileDeleteCallback = (url: string) => Promise<void>
type FileUploadCallback = (
  upload: Pick<FileUpload, 'createReadStream' | 'mimetype'> & { uniqueFilename: string },
) => Promise<string>
export interface ImageInput {
  upload?: Promise<FileUpload>
  alt?: string
  sensitive?: boolean
  aspectRatio?: number
  type?: string
}

// const widths = [34, 160, 320, 640, 1024]
const { AWS_BUCKET: Bucket, S3_CONFIGURED } = CONFIG

const createS3Client = () => {
  const { AWS_ENDPOINT, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY } = CONFIG
  if (!(AWS_ENDPOINT && AWS_ACCESS_KEY_ID && AWS_SECRET_ACCESS_KEY)) {
    throw new Error('Missing AWS credentials.')
  }
  return new S3Client({
    credentials: {
      accessKeyId: AWS_ACCESS_KEY_ID,
      secretAccessKey: AWS_SECRET_ACCESS_KEY,
    },
    endpoint: AWS_ENDPOINT,
    forcePathStyle: true,
  })
}

interface DeleteImageOpts {
  transaction?: Transaction
  deleteCallback?: FileDeleteCallback
}
export async function deleteImage(resource, relationshipType, opts: DeleteImageOpts = {}) {
  sanitizeRelationshipType(relationshipType)
  const { transaction, deleteCallback } = opts
  if (!transaction) return wrapTransaction(deleteImage, [resource, relationshipType], opts)
  const txResult = await transaction.run(
    `
    MATCH (resource {id: $resource.id})-[rel:${relationshipType}]->(image:Image)
    WITH image, image {.*} as imageProps
    DETACH DELETE image
    RETURN imageProps
  `,
    { resource },
  )
  const [image] = txResult.records.map((record) => record.get('imageProps'))
  // This behaviour differs from `mergeImage`. If you call `mergeImage`
  // with metadata for an image that does not exist, it's an indicator
  // of an error (so throw an error). If we bulk delete an image, it
  // could very well be that there is no image for the resource.
  if (image) deleteImageFile(image, deleteCallback)
  return image
}

interface MergeImageOpts {
  transaction?: Transaction
  uploadCallback?: FileUploadCallback
  deleteCallback?: FileDeleteCallback
}

export async function mergeImage(
  resource,
  relationshipType,
  imageInput: ImageInput | null | undefined,
  opts: MergeImageOpts = {},
) {
  if (typeof imageInput === 'undefined') return
  if (imageInput === null) return deleteImage(resource, relationshipType, opts)
  sanitizeRelationshipType(relationshipType)
  const { transaction, uploadCallback, deleteCallback } = opts
  if (!transaction)
    return wrapTransaction(mergeImage, [resource, relationshipType, imageInput], opts)

  let txResult
  txResult = await transaction.run(
    `
    MATCH (resource {id: $resource.id})-[:${relationshipType}]->(image:Image)
    RETURN image {.*}
    `,
    { resource },
  )
  const [existingImage] = txResult.records.map((record) => record.get('image'))
  const { upload } = imageInput
  if (!(existingImage || upload)) throw new UserInputError('Cannot find image for given resource')
  if (existingImage && upload) deleteImageFile(existingImage, deleteCallback)
  const url = await uploadImageFile(upload, uploadCallback)
  const { alt, sensitive, aspectRatio, type } = imageInput
  const image = { alt, sensitive, aspectRatio, url, type }
  txResult = await transaction.run(
    `
    MATCH (resource {id: $resource.id})
    MERGE (resource)-[:${relationshipType}]->(image:Image)
    ON CREATE SET image.createdAt = toString(datetime())
    ON MATCH SET image.updatedAt = toString(datetime())
    SET image += $image
    RETURN image {.*}
    `,
    { resource, image },
  )
  const [mergedImage] = txResult.records.map((record) => record.get('image'))
  return mergedImage
}

const wrapTransaction = async (wrappedCallback, args, opts) => {
  const session = getDriver().session()
  try {
    const result = await session.writeTransaction(async (transaction) => {
      return wrappedCallback(...args, { ...opts, transaction })
    })
    return result
  } finally {
    await session.close()
  }
}

const deleteImageFile = (image, deleteCallback: FileDeleteCallback | undefined) => {
  if (!deleteCallback) {
    deleteCallback = S3_CONFIGURED ? s3Delete : localFileDelete
  }
  const { url } = image
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  deleteCallback(url)
  return url
}

const uploadImageFile = async (
  upload: Promise<FileUpload> | undefined,
  uploadCallback: FileUploadCallback | undefined,
) => {
  if (!upload) return undefined
  if (!uploadCallback) {
    uploadCallback = S3_CONFIGURED ? s3Upload : localFileUpload
  }
  // eslint-disable-next-line @typescript-eslint/unbound-method
  const { createReadStream, filename, mimetype } = await upload
  const { name, ext } = path.parse(filename)
  const uniqueFilename = `${uuid()}-${slug(name)}${ext}`
  return uploadCallback({ createReadStream, uniqueFilename, mimetype })
}

const sanitizeRelationshipType = (relationshipType) => {
  // Cypher query language does not allow to parameterize relationship types
  // See: https://github.com/neo4j/neo4j/issues/340
  if (!['HERO_IMAGE', 'AVATAR_IMAGE'].includes(relationshipType)) {
    throw new Error(`Unknown relationship type ${relationshipType}`)
  }
}

const localFileUpload: FileUploadCallback = ({ createReadStream, uniqueFilename }) => {
  const destination = `/uploads/${uniqueFilename}`
  return new Promise((resolve, reject) =>
    createReadStream().pipe(
      createWriteStream(`public${destination}`)
        .on('finish', () => resolve(destination))
        .on('error', (error) => reject(error)),
    ),
  )
}

const s3Upload: FileUploadCallback = async ({ createReadStream, uniqueFilename, mimetype }) => {
  const s3Location = `original/${uniqueFilename}`
  const params = {
    Bucket,
    Key: s3Location,
    ACL: ObjectCannedACL.public_read,
    ContentType: mimetype,
    Body: createReadStream(),
  }
  const s3 = createS3Client()
  const command = new Upload({ client: s3, params })
  const data = await command.done()
  const { Location } = data
  if (!Location) {
    throw new Error('File upload did not return `Location`')
  }
  return Location
}

const localFileDelete: FileDeleteCallback = async (url) => {
  const location = `public${url}`
  // eslint-disable-next-line n/no-sync
  if (existsSync(location)) unlinkSync(location)
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
  const s3 = createS3Client()
  await s3.send(new DeleteObjectCommand(params))
}
