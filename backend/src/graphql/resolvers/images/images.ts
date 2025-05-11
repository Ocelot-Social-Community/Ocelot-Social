import CONFIG from '@config/index'

import { images as imagesLocal } from './imagesLocal'
import { images as imagesS3 } from './imagesS3'

import type { FileUpload } from 'graphql-upload'
import type { Transaction } from 'neo4j-driver'

export type FileDeleteCallback = (url: string) => Promise<void>

export type FileUploadCallback = (
  upload: Pick<FileUpload, 'createReadStream' | 'mimetype'> & { uniqueFilename: string },
) => Promise<string>
export interface DeleteImageOpts {
  transaction?: Transaction
  deleteCallback?: FileDeleteCallback
}

export interface MergeImageOpts {
  transaction?: Transaction
  uploadCallback?: FileUploadCallback
  deleteCallback?: FileDeleteCallback
}

export interface ImageInput {
  upload?: Promise<FileUpload>
  alt?: string
  sensitive?: boolean
  aspectRatio?: number
  type?: string
}

export interface Images {
  deleteImage: (resource, relationshipType, opts: DeleteImageOpts) => Promise<any>
  mergeImage: (
    resource,
    relationshipType,
    imageInput: ImageInput | null | undefined,
    opts: MergeImageOpts,
  ) => Promise<any>
}

const images = CONFIG.S3_CONFIGURED ? imagesS3(CONFIG) : imagesLocal
const { mergeImage, deleteImage } = images
export { mergeImage, deleteImage }
