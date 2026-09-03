/* eslint-disable @typescript-eslint/no-shadow */
import { describe, it, expect } from 'vitest'

import { TEST_CONFIG } from '@root/test/helpers'

import ImageResolver from './images'

describe('Image', () => {
  const { Image } = ImageResolver
  const Location =
    'https://fsn1.your-objectstorage.com/ocelot-social-staging/original/f965ea15-1f6b-43aa-a535-927410e2585e-dsc02586.jpg'
  const defaultConfig = {
    ...TEST_CONFIG,
    AWS_ENDPOINT: 'https://fsn1.your-objectstorage.com',
    IMAGOR_PUBLIC_URL: 'https://imagor-public-url.com',
    IMAGOR_SECRET: 'IMAGOR_SECRET',
  }

  describe('.transform', () => {
    describe('no transformations', () => {
      const config = { ...defaultConfig }
      const args = {}

      it('just points the original url to imagor and adds a signature', () => {
        const expectedUrl =
          'https://imagor-public-url.com/f_qz7PlAWIQx-IrMOZfikzDFM6I=/ocelot-social-staging/original/f965ea15-1f6b-43aa-a535-927410e2585e-dsc02586.jpg'

        expect(Image.transform({ url: Location }, args, { config })).toEqual(expectedUrl)
      })

      describe('if `IMAGOR_PUBLIC_URL` has a path segment', () => {
        const config = {
          ...defaultConfig,
          IMAGOR_PUBLIC_URL: 'https://imagor-public-url.com/path-segment',
        }

        it('keeps the path segment', () => {
          const expectedUrl =
            'https://imagor-public-url.com/path-segment/f_qz7PlAWIQx-IrMOZfikzDFM6I=/ocelot-social-staging/original/f965ea15-1f6b-43aa-a535-927410e2585e-dsc02586.jpg'

          expect(Image.transform({ url: Location }, args, { config })).toEqual(expectedUrl)
        })
      })
    })

    describe('resize transformations', () => {
      const config = { ...defaultConfig }
      const args = { width: 320 }

      it('encodes `fit-in` imagor transformations in the URL', () => {
        const expectedUrl =
          'https://imagor-public-url.com/1OEqC7g0YFxuvnRCX2hOukYMJEY=/fit-in/320x5000/ocelot-social-staging/original/f965ea15-1f6b-43aa-a535-927410e2585e-dsc02586.jpg'

        expect(Image.transform({ url: Location }, args, { config })).toEqual(expectedUrl)
      })

      // `fit-in` scales to fit INSIDE the box, so the missing dimension has to be effectively
      // unbounded. A 0 or an omitted segment would make imagor reject the path (or crop), which
      // is why the unspecified side is filled with the fallback maximum rather than left out.
      it('fills the unspecified dimension with the fallback maximum', () => {
        const url = Image.transform({ url: Location }, { height: 240 }, { config })

        expect(url).toContain('/fit-in/5000x240/')
      })
    })

    // Everything below is a path where the resolver must hand back the URL it was given — the
    // stored S3 location — instead of an imagor URL that would 404.
    describe('pass-through cases', () => {
      it('returns the original URL when no imagor is configured', () => {
        // The empty string is what an unset IMAGOR_PUBLIC_URL looks like once it has been through
        // a .env or a Kubernetes secret. The resolver does not assume config validation ran, and
        // this guard is why: rewriting every image URL to point at an imagor that is not there
        // would break every image on the instance, whereas serving them straight from S3 works.
        const config = { ...defaultConfig, IMAGOR_PUBLIC_URL: '' }

        expect(Image.transform({ url: Location }, {}, { config })).toEqual(Location)
      })

      it('leaves an externally hosted image alone', () => {
        // Seeded and imported content points at hosts this instance's imagor has no loader for
        // (imagor is configured for our own bucket). Rewriting those would replace working
        // remote images with dead links.
        const external = 'https://images.unsplash.com/photo-1234.jpg'

        expect(Image.transform({ url: external }, { width: 320 }, { config: defaultConfig })).toBe(
          external,
        )
      })
    })

    // The signature is what imagor validates the request against; an unsigned path is refused
    // outright. Failing loudly at the first transform beats serving a page full of broken images
    // and leaving the operator to guess which of the two imagor variables was forgotten.
    it('refuses to build a URL it cannot sign', () => {
      const config = { ...defaultConfig, IMAGOR_SECRET: '' }

      expect(() => Image.transform({ url: Location }, {}, { config })).toThrow(
        'IMAGOR_SECRET is not set',
      )
    })
  })
})
