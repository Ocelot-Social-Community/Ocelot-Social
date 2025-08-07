import { getDriver } from '@db/neo4j'

import type { DeleteImageOpts, MergeImageOpts, Images, ImageInput } from './images'

export const wrapTransactionDeleteImage = async (
  wrappedCallback: Images['deleteImage'],
  args: [resource: { id: string }, relationshipType: 'HERO_IMAGE' | 'AVATAR_IMAGE'],
  opts: DeleteImageOpts,
): ReturnType<Images['deleteImage']> => {
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

export const wrapTransactionMergeImage = async (
  wrappedCallback: Images['mergeImage'],
  args: [
    resource: { id: string },
    relationshipType: 'HERO_IMAGE' | 'AVATAR_IMAGE',
    imageInput: ImageInput | null | undefined,
  ],
  opts: MergeImageOpts,
): ReturnType<Images['mergeImage']> => {
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
