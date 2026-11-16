import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import sharp from 'sharp'
import { describe, it, expect, beforeEach, afterEach, beforeAll } from 'vitest'

import {
  cropSeedImage,
  loadSeedImageSources,
  pickSource,
  resolveSeedImages,
  seedImageName,
  seedImageUploader,
} from './images'

import type { SeedImageSource } from './images'
import type { S3Config } from '@config/index'

// What the uploader hands to s3Service: the crop as a Buffer, which the S3 SDK takes as a body.
interface Upload {
  createReadStream: () => Buffer
  uniqueFilename: string
  mimetype: string
}
const { uploadFile, s3Service } = vi.hoisted(() => {
  const upload = vi.fn<(upload: Upload) => Promise<string>>()
  return {
    uploadFile: upload,
    s3Service: vi.fn(() => ({ uploadFile: upload, deleteFile: vi.fn() })),
  }
})
vi.mock('@src/uploads/s3Service', () => ({ s3Service }))

const s3Config: S3Config = {
  AWS_ACCESS_KEY_ID: 'minio',
  AWS_SECRET_ACCESS_KEY: '12341234',
  AWS_ENDPOINT: 'http://localhost:9000',
  AWS_REGION: 'local',
  AWS_BUCKET: 'ocelot',
  IMAGOR_PUBLIC_URL: 'http://localhost:8000',
  IMAGOR_SECRET: 'mysecret',
}

const source = (file: string, aspectRatio: number): SeedImageSource => ({ file, aspectRatio })
const landscape = source('landscape', 3 / 2)
const fourThree = source('four-three', 4 / 3)
const wide = source('wide', 16 / 9)
const portrait = source('portrait', 2 / 3)
const tall = source('tall', 0.45)
const sources = [landscape, fourThree, wide, portrait, tall]

describe(loadSeedImageSources, () => {
  it('reads the shape of every photo shipped next to the seed', async () => {
    const loaded = await loadSeedImageSources()

    expect(loaded.length).toBeGreaterThanOrEqual(3)

    for (const { file, aspectRatio } of loaded) {
      expect(file).toMatch(/\.jpg$/)
      expect(aspectRatio).toBeGreaterThan(0)
    }

    // Both shapes are there, or a tall post would be cut from a landscape photo.
    expect(loaded.some(({ aspectRatio }) => aspectRatio < 1)).toBe(true)
    expect(loaded.some(({ aspectRatio }) => aspectRatio > 1)).toBe(true)
  })

  describe('in a folder without photos', () => {
    let directory: string

    beforeEach(async () => {
      directory = await mkdtemp(path.join(tmpdir(), 'seed-images-'))
      // eslint-disable-next-line security/detect-non-literal-fs-filename -- a temp dir of the test's own
      await writeFile(path.join(directory, 'README.md'), 'no photos here')
    })

    afterEach(async () => {
      await rm(directory, { recursive: true })
    })

    it('refuses rather than seeding without pictures', async () => {
      await expect(loadSeedImageSources(directory)).rejects.toThrow('no source images')
    })
  })
})

describe(pickSource, () => {
  it('cuts a tall image from the tallest photos when none is close to its shape', () => {
    const picked = [0, 1, 2, 3].map((n) => pickSource(sources, { width: 300, height: 1500 }, n))

    expect(picked).toEqual([tall, portrait, fourThree, tall])
  })

  it('rotates through every photo of a similar shape, closest first', () => {
    const picked = [0, 1, 2, 3].map((n) => pickSource(sources, { width: 400, height: 300 }, n))

    // 4:3, 3:2 and 16:9 are within a factor of 1.5 of 4:3; the portraits are not.
    expect(picked).toEqual([fourThree, landscape, wide, fourThree])
  })

  it('takes more than the closest three when more are close, and none of another shape', () => {
    const close = [source('a', 4 / 3), source('b', 3 / 2), source('c', 1.4), source('d', 1.45)]
    const picked = [0, 1, 2, 3, 4].map((n) =>
      pickSource([...close, portrait], { width: 400, height: 300 }, n),
    )

    expect(picked).not.toContain(portrait)
    expect(new Set(picked).size).toBe(4)
  })

  it('measures distance on a log scale: 1:2 and 2:1 are equally far from square', () => {
    const half = source('half', 1 / 2)
    const double = source('double', 2)

    // The sort is stable, so equal distances keep their order — either way round.
    expect(pickSource([half, double], { width: 300, height: 300 }, 0)).toBe(half)
    expect(pickSource([double, half], { width: 300, height: 300 }, 0)).toBe(double)
  })

  it('makes do with fewer photos than candidates', () => {
    expect(pickSource([landscape], { width: 300, height: 1500 }, 5)).toBe(landscape)
  })
})

describe(cropSeedImage, () => {
  let photos: SeedImageSource[]

  beforeAll(async () => {
    photos = await loadSeedImageSources()
  })

  it.each([
    [300, 1500],
    [300, 169],
    [300, 857],
    [400, 300],
  ])('delivers exactly %i×%i, as picsum did', async (width, height) => {
    const photo = pickSource(photos, { width, height }, 0)
    const metadata = await sharp(await cropSeedImage(photo, { width, height })).metadata()

    expect(metadata).toMatchObject({ format: 'jpeg', width, height })
  })

  it('blurs when asked to', async () => {
    const [photo] = photos
    const sharpCrop = await cropSeedImage(photo, { width: 400, height: 300 })
    const blurred = await cropSeedImage(photo, { width: 400, height: 300, blur: 5 })
    const { width, height } = await sharp(blurred).metadata()

    expect({ width, height }).toEqual({ width: 400, height: 300 })
    // A blurred picture has less detail, and JPEG spends fewer bytes on less detail.
    expect(blurred.length).toBeLessThan(sharpCrop.length)
  })
})

describe(resolveSeedImages, () => {
  it.each([undefined, ''])('uploads its own photos when unset (%j)', (requested) => {
    expect(resolveSeedImages(requested)).toBe('local')
  })

  it.each(['local', 'picsum'] as const)('takes %s when asked for it', (requested) => {
    expect(resolveSeedImages(requested)).toBe(requested)
  })

  it.each(['Local', 'unsplash', 'true'])('refuses an unknown source: %s', (requested) => {
    expect(() => resolveSeedImages(requested)).toThrow(
      `SEED_IMAGES must be one of local, picsum, not "${requested}"`,
    )
  })
})

describe(seedImageUploader, () => {
  beforeEach(() => {
    uploadFile.mockImplementation(async ({ uniqueFilename }) =>
      Promise.resolve(`http://localhost:9000/ocelot/seed/${uniqueFilename}`),
    )
  })

  it('uploads into the bucket under seed/', async () => {
    await seedImageUploader(s3Config)

    expect(s3Service).toHaveBeenCalledWith(s3Config, 'seed')
  })

  it('uploads a JPEG of the asked size and returns where it landed', async () => {
    const imageUrl = await seedImageUploader(s3Config)
    const url = await imageUrl({ width: 300, height: 169 })

    expect(uploadFile).toHaveBeenCalledTimes(1)

    const [[upload]] = uploadFile.mock.calls

    expect(upload.mimetype).toBe('image/jpeg')
    expect(upload.uniqueFilename).toMatch(/^0000-[a-z-]+-300x169\.jpg$/)
    expect(url).toBe(`http://localhost:9000/ocelot/seed/${upload.uniqueFilename}`)

    const metadata = await sharp(upload.createReadStream()).metadata()

    expect(metadata).toMatchObject({ format: 'jpeg', width: 300, height: 169 })
  })

  it('gives every image a file of its own and varies the photo', async () => {
    const imageUrl = await seedImageUploader(s3Config)
    const urls = await Promise.all([0, 1, 2].map(async () => imageUrl({ width: 400, height: 300 })))

    expect(new Set(urls).size).toBe(3)

    const bodies = uploadFile.mock.calls.map(([upload]) =>
      upload.createReadStream().toString('base64'),
    )

    expect(new Set(bodies).size).toBe(3)
  })

  it('names the files the same on every run, so a reseed overwrites the last one', async () => {
    const run = async () => {
      uploadFile.mockClear()
      const imageUrl = await seedImageUploader(s3Config)
      for (const size of [
        { width: 400, height: 300 },
        { width: 300, height: 1500 },
        { width: 400, height: 300, blur: 2 },
      ]) {
        await imageUrl(size)
      }
      return uploadFile.mock.calls.map(([upload]) => upload.uniqueFilename)
    }
    const first = await run()

    expect(await run()).toEqual(first)
    expect(first).toHaveLength(3)
    expect(new Set(first).size).toBe(3)
  })
})

describe(seedImageName, () => {
  const photo = { file: '/seed/images/lofoten.jpg', aspectRatio: 1.5 }

  it('carries the position, the photo and the size', () => {
    expect(seedImageName(7, photo, { width: 400, height: 300 })).toBe('0007-lofoten-400x300.jpg')
  })

  it('carries the blur, which changes the picture', () => {
    expect(seedImageName(7, photo, { width: 400, height: 300, blur: 3 })).toBe(
      '0007-lofoten-400x300-blur3.jpg',
    )
  })

  it('names another picture at the same position differently, so no cache serves the old one', () => {
    const other = { file: '/seed/images/autumn-lake.jpg', aspectRatio: 1.5 }

    expect(seedImageName(7, other, { width: 400, height: 300 })).not.toBe(
      seedImageName(7, photo, { width: 400, height: 300 }),
    )
    expect(seedImageName(7, photo, { width: 300, height: 1500 })).not.toBe(
      seedImageName(7, photo, { width: 400, height: 300 }),
    )
  })
})
