/* eslint-disable @typescript-eslint/require-await */

/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable promise/avoid-new */
/* eslint-disable security/detect-non-literal-fs-filename */

import { existsSync, unlinkSync, createWriteStream } from 'node:fs'
import path from 'node:path'

import { UserInputError } from 'apollo-server'
import slug from 'slug'
import { v4 as uuid } from 'uuid'

import { wrapTransaction } from './wrapTransaction'

import type { Images, FileDeleteCallback, FileUploadCallback } from './images'
import type { FileUpload } from 'graphql-upload'

const deleteImage: Images['deleteImage'] = async (resource, relationshipType, opts = {}) => {
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

const mergeImage: Images['mergeImage'] = async (
  resource,
  relationshipType,
  imageInput,
  opts = {},
) => {
  if (typeof imageInput === 'undefined') return
  if (imageInput === null) return deleteImage(resource, relationshipType, opts)
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

const localFileDelete: FileDeleteCallback = async (url) => {
  const location = `public${url}`
  // eslint-disable-next-line n/no-sync
  if (existsSync(location)) unlinkSync(location)
}

const deleteImageFile = (image, deleteCallback: FileDeleteCallback | undefined) => {
  if (!deleteCallback) {
    deleteCallback = localFileDelete
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
    uploadCallback = localFileUpload
  }
  // eslint-disable-next-line @typescript-eslint/unbound-method
  const { createReadStream, filename, mimetype } = await upload
  const { name, ext } = path.parse(filename)
  const uniqueFilename = `${uuid()}-${slug(name)}${ext}`
  return uploadCallback({ createReadStream, uniqueFilename, mimetype })
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

export const images: Images = {
  deleteImage,
  mergeImage,
}
