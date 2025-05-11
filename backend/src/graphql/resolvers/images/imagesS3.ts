/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/restrict-template-expressions */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */

import path from 'node:path'

import { S3Client, DeleteObjectCommand, ObjectCannedACL } from '@aws-sdk/client-s3'
import { Upload } from '@aws-sdk/lib-storage'
import { UserInputError } from 'apollo-server'
import slug from 'slug'
import { v4 as uuid } from 'uuid'

import type CONFIG from '@config/index'
import { getDriver } from '@db/neo4j'

import type {
  DeleteImageOpts,
  Images,
  MergeImageOpts,
  FileDeleteCallback,
  FileUploadCallback,
  ImageInput,
} from './images'
import type { FileUpload } from 'graphql-upload'

export const images = (
  config: Pick<
    typeof CONFIG,
    | 'AWS_ACCESS_KEY_ID'
    | 'AWS_SECRET_ACCESS_KEY'
    | 'AWS_ENDPOINT'
    | 'AWS_REGION'
    | 'AWS_BUCKET'
    | 'S3_PUBLIC_GATEWAY'
  >,
) => {
  // const widths = [34, 160, 320, 640, 1024]
  const { AWS_BUCKET: Bucket, S3_PUBLIC_GATEWAY } = config

  const { AWS_ENDPOINT, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY } = config
  if (
    !(AWS_ENDPOINT && AWS_ACCESS_KEY_ID && AWS_SECRET_ACCESS_KEY && Bucket && S3_PUBLIC_GATEWAY)
  ) {
    throw new Error('Missing AWS credentials.')
  }
  const s3 = new S3Client({
    credentials: {
      accessKeyId: AWS_ACCESS_KEY_ID,
      secretAccessKey: AWS_SECRET_ACCESS_KEY,
    },
    endpoint: AWS_ENDPOINT,
    forcePathStyle: true,
  })

  const deleteImage = async (resource, relationshipType, opts: DeleteImageOpts = {}) => {
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

  const mergeImage = async (
    resource,
    relationshipType,
    imageInput: ImageInput | null | undefined,
    opts: MergeImageOpts = {},
  ) => {
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
      deleteCallback = s3Delete
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
      uploadCallback = s3Upload
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

  const s3Upload: FileUploadCallback = async ({ createReadStream, uniqueFilename, mimetype }) => {
    const s3Location = `original/${uniqueFilename}`
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
    const publicLocation = new URL(S3_PUBLIC_GATEWAY)
    publicLocation.pathname = new URL(Location).pathname
    return publicLocation.href
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

  const images = {
    deleteImage,
    mergeImage,
  } satisfies Images
  return images
}
