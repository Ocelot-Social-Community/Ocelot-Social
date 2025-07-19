import type { Context } from '@src/context'
import type { FileDeleteCallback, FileUploadCallback } from '@src/uploads/types'

import { images as imagesS3 } from './imagesS3'

import type { FileUpload } from 'graphql-upload'
import type { Transaction } from 'neo4j-driver'

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

export interface Image {
  url: string
  alt?: string
  sensitive?: boolean
  aspectRatio?: number
  type?: string
}

export interface Images {
  deleteImage: (
    resource: { id: string },
    relationshipType: 'HERO_IMAGE' | 'AVATAR_IMAGE',
    opts?: DeleteImageOpts,
  ) => Promise<Image>

  mergeImage: (
    resource: { id: string },
    relationshipType: 'HERO_IMAGE' | 'AVATAR_IMAGE',
    imageInput: ImageInput | null | undefined,
    opts?: MergeImageOpts,
  ) => Promise<Image | undefined>
}

export const images = (config: Context['config']) => imagesS3(config)
