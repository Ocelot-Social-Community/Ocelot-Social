import path from 'node:path'

import { UserInputError } from 'apollo-server'
import { FileUpload } from 'graphql-upload'
import slug from 'slugify'
import { v4 as uuid } from 'uuid'

import type { S3Config } from '@config/index'
import { s3Service } from '@src/uploads/s3Service'

import { wrapTransaction } from './wrapTransaction'

import type { Image, Images } from './images'

export const images = (config: S3Config) => {
  const s3 = s3Service(config, 'original')

  const deleteImage: Images['deleteImage'] = async (resource, relationshipType, opts = {}) => {
    const { transaction } = opts
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
      await s3.deleteFile(image.url)
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
    const { transaction } = opts
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
      await s3.deleteFile(existingImage.url)
    }
    const url = await uploadImageFile(upload)
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

  const uploadImageFile = async (uploadPromise: Promise<FileUpload> | undefined) => {
    if (!uploadPromise) return undefined
    const upload = await uploadPromise
    const { name, ext } = path.parse(upload.filename)
    const uniqueFilename = `${uuid()}-${slug(name)}${ext}`
    return await s3.uploadFile({ ...upload, uniqueFilename })
  }

  const images = {
    deleteImage,
    mergeImage,
  } satisfies Images
  return images
}
