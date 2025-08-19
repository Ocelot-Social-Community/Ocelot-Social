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
    })
  })
})
