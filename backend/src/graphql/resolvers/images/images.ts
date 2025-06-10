import CONFIG, { isS3configured } from '@config/index'

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
    relationshipType: 'HERO_IMAGE' | 'AVATAR_IMAGE' | 'ATTACHMENT',
    opts?: DeleteImageOpts,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ) => Promise<any>

  mergeImage: (
    resource: { id: string },
    relationshipType: 'HERO_IMAGE' | 'AVATAR_IMAGE' | 'ATTACHMENT',
    imageInput: ImageInput | null | undefined,
    opts?: MergeImageOpts,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ) => Promise<any>
}

export const images = isS3configured(CONFIG) ? imagesS3(CONFIG) : imagesLocal
