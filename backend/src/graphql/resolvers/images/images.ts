import { isS3configured } from '@config/index'
import type { Context } from '@src/context'

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

export const images = (config: Context['config']) =>
  isS3configured(config) ? imagesS3(config) : imagesLocal
