import crypto from 'node:crypto'
import { join as joinPath } from 'node:path/posix'

import type { Config } from '@src/config'

import Resolver from './helpers/Resolver'

type UrlResolver = (
  parent: { url: string },
  args: { width?: number; height?: number },
  {
    config: { S3_PUBLIC_GATEWAY },
  }: { config: Pick<Config, 'IMAGOR_SECRET' | 'S3_PUBLIC_GATEWAY' | 'AWS_ENDPOINT'> },
) => string

const changeDomain: (opts: { transformations: UrlResolver[] }) => UrlResolver =
  ({ transformations }) =>
  ({ url }, _args, context) => {
    const { config } = context
    const { S3_PUBLIC_GATEWAY, AWS_ENDPOINT } = config
    if (!(S3_PUBLIC_GATEWAY && AWS_ENDPOINT)) {
      return url
    }
    const originalUrl = new URL(url, AWS_ENDPOINT) // some S3 object storages return invalid URLs as location, so put the AWS_ENDPOINT as `base`
    if (originalUrl.host !== new URL(AWS_ENDPOINT).host) {
      // In this case it's an external upload - maybe seeded?
      // Let's not change the URL in this case
      return url
    }

    const transformedUrl = new URL(
      chain(...transformations)({ url: originalUrl.href }, _args, context),
    )
    const publicUrl = new URL(S3_PUBLIC_GATEWAY)
    publicUrl.pathname = joinPath(publicUrl.pathname, transformedUrl.pathname)
    return publicUrl.href
  }

const sign: UrlResolver = ({ url }, _args, { config: { IMAGOR_SECRET } }) => {
  if (!IMAGOR_SECRET) {
    throw new Error('IMAGOR_SECRET is not set')
  }
  const newUrl = new URL(url)
  const path = newUrl.pathname.replace('/', '')
  const hash = crypto
    .createHmac('sha1', IMAGOR_SECRET)
    .update(path)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
  newUrl.pathname = hash + newUrl.pathname
  return newUrl.href
}

const FALLBACK_MAXIMUM_LENGTH = 5000
const resize: UrlResolver = ({ url }, { height, width }) => {
  if (!(height || width)) {
    return url
  }
  const window = `/fit-in/${width ?? FALLBACK_MAXIMUM_LENGTH}x${height ?? FALLBACK_MAXIMUM_LENGTH}`
  const newUrl = new URL(url)
  newUrl.pathname = window + newUrl.pathname
  return newUrl.href
}

const chain: (...methods: UrlResolver[]) => UrlResolver = (...methods) => {
  return (parent, args, context) => {
    let { url } = parent
    for (const method of methods) {
      url = method({ url }, args, context)
    }
    return url
  }
}

export default {
  Image: {
    ...Resolver('Image', {
      undefinedToNull: ['sensitive', 'alt', 'aspectRatio', 'type'],
    }),
    url: changeDomain({ transformations: [sign] }),
    transform: changeDomain({ transformations: [resize, sign] }),
  },
}
