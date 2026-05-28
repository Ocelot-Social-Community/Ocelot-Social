import { internalPageMixins } from './internalPageMixins.js'

jest.mock('~/constants/links.js', () => ({
  __esModule: true,
  default: {
    MADE: { name: 'made', internalPage: { headTitleIdent: 'site.made' } },
    IMPRINT: { name: 'imprint', internalPage: { headTitleIdent: 'site.imprint' } },
  },
}))

describe('internalPageMixins', () => {
  const built = internalPageMixins()

  it('forces the basic layout', () => {
    expect(built.layout).toBe('basic')
  })

  it('declares the InternalPage component', () => {
    expect(built.components.InternalPage).toBeDefined()
  })

  describe('head()', () => {
    it('returns the title from $t(headTitleIdent)', () => {
      const ctx = {
        $t: jest.fn((k) => `t:${k}`),
        pageParams: { internalPage: { headTitleIdent: 'site.foo' } },
      }
      expect(built.head.call(ctx)).toEqual({ title: 't:site.foo' })
      expect(ctx.$t).toHaveBeenCalledWith('site.foo')
    })
  })

  describe('asyncData()', () => {
    it('returns pageParams from the matching links entry', async () => {
      const error = jest.fn()
      const result = await built.asyncData({ params: { static: 'made' }, error })
      expect(error).not.toHaveBeenCalled()
      expect(result).toEqual({
        pageParams: { name: 'made', internalPage: { headTitleIdent: 'site.made' } },
      })
    })

    it('errors with 404 when no link matches', async () => {
      const error = jest.fn()
      await built.asyncData({ params: { static: 'unknown' }, error })
      expect(error).toHaveBeenCalledWith({
        statusCode: 404,
        key: 'error-pages.404-default',
      })
    })
  })
})
