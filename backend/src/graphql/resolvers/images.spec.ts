import { TEST_CONFIG } from '@src/config/test-mock'

import ImageResolver from './images'

describe('Image', () => {
  const { Image } = ImageResolver
  const args = {}
  const Location =
    'https://fsn1.your-objectstorage.com/ocelot-social-staging/original/f965ea15-1f6b-43aa-a535-927410e2585e-dsc02586.jpg'
  const defaultConfig = {
    ...TEST_CONFIG,
    AWS_ENDPOINT: 'https://fsn1.your-objectstorage.com',
    S3_PUBLIC_GATEWAY: 'https://your-public-gateway.com',
    IMAGOR_SECRET: 'IMAGOR_SECRET',
  }

  describe('.url', () => {
    const config = { ...defaultConfig }
    it('replaces the internal domain of the S3 `Location` with a public domain', () => {
      const expectedUrl =
        'https://your-public-gateway.com/f_qz7PlAWIQx-IrMOZfikzDFM6I=/ocelot-social-staging/original/f965ea15-1f6b-43aa-a535-927410e2585e-dsc02586.jpg'
      expect(Image.url({ url: Location }, args, { config })).toEqual(expectedUrl)
    })

    describe('given `S3_PUBLIC_GATEWAY` has a path segment', () => {
      const config = {
        ...defaultConfig,
        S3_PUBLIC_GATEWAY: 'https://your-public-gateway.com/imagor',
      }

      it('keeps the path segment', () => {
        const expectedUrl =
          'https://your-public-gateway.com/imagor/f_qz7PlAWIQx-IrMOZfikzDFM6I=/ocelot-social-staging/original/f965ea15-1f6b-43aa-a535-927410e2585e-dsc02586.jpg'
        expect(Image.url({ url: Location }, args, { config })).toEqual(expectedUrl)
      })
    })
  })

  describe('.transform', () => {
    describe('resize transformations', () => {
      const config = { ...defaultConfig }
      const args = { width: 320 }

      it('encodes `fit-in` imagor transformations in the URL', () => {
        const expectedUrl =
          'https://your-public-gateway.com/1OEqC7g0YFxuvnRCX2hOukYMJEY=/fit-in/320x5000/ocelot-social-staging/original/f965ea15-1f6b-43aa-a535-927410e2585e-dsc02586.jpg'
        expect(Image.transform({ url: Location }, args, { config })).toEqual(expectedUrl)
      })
    })
  })
})
