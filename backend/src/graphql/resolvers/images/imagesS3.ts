import path from 'node:path'

import { S3Client, DeleteObjectCommand, ObjectCannedACL } from '@aws-sdk/client-s3'
import { Upload } from '@aws-sdk/lib-storage'
import { UserInputError } from 'apollo-server'
import slug from 'slug'
import { v4 as uuid } from 'uuid'

import { S3Configured } from '@config/index'

import { wrapTransaction } from './wrapTransaction'

import type { Image, Images, FileDeleteCallback, FileUploadCallback } from './images'
import type { FileUpload } from 'graphql-upload'

export const images = (config: S3Configured) => {
  // const widths = [34, 160, 320, 640, 1024]
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

  const deleteImage: Images['deleteImage'] = async (resource, relationshipType, opts = {}) => {
    sanitizeRelationshipType(relationshipType)
    const { transaction, deleteCallback = s3Delete } = opts
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
    const [image] = txResult.records.map((record) => record.get('imageProps') as Image)
    // This behaviour differs from `mergeImage`. If you call `mergeImage`
    // with metadata for an image that does not exist, it's an indicator
    // of an error (so throw an error). If we bulk delete an image, it
    // could very well be that there is no image for the resource.
    if (image) {
      await deleteCallback(image.url)
    }
    return image
  }

  const mergeImage: Images['mergeImage'] = async (
    resource,
    relationshipType,
    imageInput,
    opts = {},
  ) => {
    if (typeof imageInput === 'undefined') return
    if (imageInput === null) return deleteImage(resource, relationshipType, opts)
    sanitizeRelationshipType(relationshipType)
    const { transaction, uploadCallback, deleteCallback = s3Delete } = opts
    if (!transaction)
      return wrapTransaction(mergeImage, [resource, relationshipType, imageInput], opts)

    let txResult = await transaction.run(
      `
      MATCH (resource {id: $resource.id})-[:${relationshipType}]->(image:Image)
      RETURN image {.*}
      `,
      { resource },
    )
    const [existingImage] = txResult.records.map((record) => record.get('image') as Image)
    const { upload } = imageInput
    if (!(existingImage || upload)) throw new UserInputError('Cannot find image for given resource')
    if (existingImage && upload) {
      await deleteCallback(existingImage.url)
    }
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
    const [mergedImage] = txResult.records.map((record) => record.get('image') as Image)
    return mergedImage
  }

  const uploadImageFile = async (
    uploadPromise: Promise<FileUpload> | undefined,
    uploadCallback: FileUploadCallback | undefined = s3Upload,
  ) => {
    if (!uploadPromise) return undefined
    const upload = await uploadPromise
    const { name, ext } = path.parse(upload.filename)
    const uniqueFilename = `${uuid()}-${slug(name)}${ext}`
    const Location = await uploadCallback({ ...upload, uniqueFilename })
    if (!S3_PUBLIC_GATEWAY) {
      return Location
    }
    const publicLocation = new URL(S3_PUBLIC_GATEWAY)
    publicLocation.pathname = new URL(Location).pathname
    return publicLocation.href
  }

  const sanitizeRelationshipType = (relationshipType: string) => {
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

  const images: Images = {
    deleteImage,
    mergeImage,
  }
  return images
}
