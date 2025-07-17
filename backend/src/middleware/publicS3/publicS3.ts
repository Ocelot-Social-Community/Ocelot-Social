import type { Context } from '@src/context'

type Resolver = (
  parent: { url: string },
  args: unknown,
  context: Context,
  resolveInfo: unknown,
) => Promise<unknown>

const replaceHostWithPublicS3Endpoint = (
  resolve: Resolver,
  parent: { url: string },
  args: unknown,
  context: Context,
  resolveInfo: unknown,
) => {
  const { S3_PUBLIC_URL } = context.config
  if (!S3_PUBLIC_URL) {
    return resolve(parent, args, context, resolveInfo)
  }

  const newUrl = new URL(parent.url)
  const publicUrl = new URL(S3_PUBLIC_URL)
  newUrl.host = publicUrl.host
  return resolve({ url: newUrl.href }, args, context, resolveInfo)
}

export default {
  Image: {
    url: replaceHostWithPublicS3Endpoint,
  },
  File: {
    url: replaceHostWithPublicS3Endpoint,
  },
}
