import { TEST_CONFIG } from '@src/config/test-mock'

import ImageResolver from './images'

describe('Image', () => {
  const { Image } = ImageResolver
  const args = {}
  const Location =
    'fsn1.your-objectstorage.com/ocelot-social-staging/original/f965ea15-1f6b-43aa-a535-927410e2585e-dsc02586.jpg'
  const config = {
    ...TEST_CONFIG,
    AWS_ENDPOINT: 'https://fsn1.your-objectstorage.com',
    S3_PUBLIC_GATEWAY: 'https://your-public-gateway.com',
    IMAGOR_SECRET: 'IMAGOR_SECRET',
  }

  describe('.url', () => {
    it('replaces the internal domain of the S3 `Location` with a public domain', () => {
      const expectedUrl =
        'https://your-public-gateway.com/iJ5iCYb-c6DnvQHTLrKcIlioWVk=/fsn1.your-objectstorage.com/ocelot-social-staging/original/f965ea15-1f6b-43aa-a535-927410e2585e-dsc02586.jpg'
      expect(Image.url({ url: Location }, args, { config })).toEqual(expectedUrl)
    })
  })

  describe('.transform', () => {
    describe('resize transformations', () => {
      const args = { width: 320 }

      it('encodes `fit-in` imagor transformations in the URL', () => {
        const expectedUrl =
          'https://your-public-gateway.com/gg1VO_owYoOkltsIPNNFV7JcuUE=/fit-in/320x5000/fsn1.your-objectstorage.com/ocelot-social-staging/original/f965ea15-1f6b-43aa-a535-927410e2585e-dsc02586.jpg'
        expect(Image.transform({ url: Location }, args, { config })).toEqual(expectedUrl)
      })
    })
  })
})
