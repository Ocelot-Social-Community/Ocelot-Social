import { readdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import sharp from 'sharp'

import { s3Service } from '@src/uploads/s3Service'

import type { S3Config } from '@config/index'

// The seed's post images used to be picsum.photos URLs, fetched by every visitor's browser: when
// picsum is down the feed shows empty frames, and while it is up it learns who reads the network.
// The seed now crops one of the photos next to this file to the size it asks for — what picsum
// did — and uploads it like any other upload, so it is served from the bucket through imagor.
// The photos are CC0, see images/README.md.

export interface SeedImageSize {
  width: number
  height: number
  // picsum's blur, 1–10; passed to sharp as the sigma of its Gaussian blur.
  blur?: number
}

export interface SeedImageSource {
  file: string
  aspectRatio: number
}

export const SEED_IMAGES_DIRECTORY = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'images',
)

export const loadSeedImageSources = async (
  directory = SEED_IMAGES_DIRECTORY,
): Promise<SeedImageSource[]> => {
  // eslint-disable-next-line security/detect-non-literal-fs-filename
  const files = (await readdir(directory)).filter((name) => name.endsWith('.jpg')).sort()
  if (files.length === 0) {
    throw new Error(`seed: no source images in ${directory}`)
  }
  return Promise.all(
    files.map(async (name) => {
      const file = path.join(directory, name)
      const { width, height } = await sharp(file).metadata()
      return { file, aspectRatio: width / height }
    }),
  )
}

// Which sources take turns for a size. A crop to 300×1500 out of a landscape photo is a sliver of
// it, so each size draws from the photos whose shape is close to it: every one within a factor of
// 1.5 of the target's ratio — all the landscapes for a 4:3 post, so the feed is not the same three
// pictures over and over — but at least the closest few, for shapes no photo comes near.
const MAX_SHAPE_DISTANCE = Math.log(1.5)
const MIN_CANDIDATES = 3

// Picks the source for the n-th image: the sources ranked by how far their shape is from the
// target's (on a log scale, so 1:2 and 2:1 are equally far from 1:1), then the n-th of the
// candidates. Deterministic, so a reseed shows the same pictures.
export const pickSource = (
  sources: SeedImageSource[],
  { width, height }: SeedImageSize,
  n: number,
): SeedImageSource => {
  const target = Math.log(width / height)
  const distance = (source: SeedImageSource) => Math.abs(Math.log(source.aspectRatio) - target)
  const ranked = [...sources].sort((a, b) => distance(a) - distance(b))
  const close = ranked.filter((source) => distance(source) <= MAX_SHAPE_DISTANCE)
  const candidates = close.length >= MIN_CANDIDATES ? close : ranked.slice(0, MIN_CANDIDATES)
  return candidates[n % candidates.length]
}

// Exactly width×height, like picsum: cover the box and cut away what sticks out, keeping the part
// sharp's attention strategy finds most interesting rather than always the centre.
export const cropSeedImage = async (
  source: SeedImageSource,
  { width, height, blur }: SeedImageSize,
): Promise<Buffer> => {
  let image = sharp(source.file).resize(width, height, {
    fit: 'cover',
    position: 'attention',
  })
  if (blur) {
    image = image.blur(blur)
  }
  return image.jpeg({ quality: 80, mozjpeg: true }).toBuffer()
}

// Where the post images come from, chosen with SEED_IMAGES:
//   local   (default) cropped from the photos in images/ and uploaded to the bucket, served through
//           imagor like any upload. The config requires S3 everywhere, so there always is a bucket.
//   picsum  picsum.photos URLs, loaded by every visitor's browser from picsum — for a stack whose
//           uploads a browser cannot reach, such as the e2e stack, which runs no imagor.
// Empty counts as unset, as a Kubernetes manifest may leave it.
export const SEED_IMAGE_SOURCES = ['local', 'picsum'] as const
export type SeedImageSourceName = (typeof SEED_IMAGE_SOURCES)[number]

export const resolveSeedImages = (requested: string | undefined): SeedImageSourceName => {
  if (!requested) {
    return 'local'
  }
  const known = SEED_IMAGE_SOURCES.find((name) => name === requested)
  if (!known) {
    throw new Error(
      `seed: SEED_IMAGES must be one of ${SEED_IMAGE_SOURCES.join(', ')}, not "${requested}"`,
    )
  }
  return known
}

// The object name of the n-th seed image. Fixed rather than random, so a reseed writes over the
// pictures of the last one instead of piling up beside them — db:reset empties the database, not
// the bucket. The photo and the size are part of the name, because the bucket serves with a week of
// Cache-Control and imagor caches by path: the same name must never stand for another picture,
// even after the photos or the seed's order change.
export const seedImageName = (n: number, source: SeedImageSource, size: SeedImageSize): string => {
  const photo = path.basename(source.file, path.extname(source.file))
  const blur = size.blur ? `-blur${String(size.blur)}` : ''
  return `${String(n).padStart(4, '0')}-${photo}-${String(size.width)}x${String(size.height)}${blur}.jpg`
}

// The image URL source for the factories: crops, uploads under `seed/` and returns the location.
export const seedImageUploader = async (config: S3Config) => {
  const sources = await loadSeedImageSources()
  const { uploadFile } = s3Service(config, 'seed')
  let n = 0
  return async (size: SeedImageSize): Promise<string> => {
    const index = n++
    const source = pickSource(sources, size, index)
    const body = await cropSeedImage(source, size)
    return uploadFile({
      createReadStream: () => body,
      uniqueFilename: seedImageName(index, source, size),
      mimetype: 'image/jpeg',
    })
  }
}
