import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// `vi.mock` is hoisted, so the factory has to hand out the real `Response` itself — a pre-mock
// import would bind the mock. NOTHING in this file may reach the network: the embed resolver is
// the one place the backend fetches a URL a user supplied, and a spec that really fetched it
// would be both flaky and an outbound request per test run.
vi.mock('node-fetch', async () => ({
  ...(await vi.importActual<object>('node-fetch')),
  default: vi.fn(),
}))

const { default: fetch, Response } = await import('node-fetch')

type FetchResponse = InstanceType<typeof Response>

const { default: scrape } = await import('./scraper')
const mockedFetch = vi.mocked(fetch)

const page = (head: string) => `<html><head>${head}</head><body>Some body text.</body></html>`

// The page is fetched by string URL, the oEmbed endpoint as a `URL` object (scraper.ts builds one
// to append the query parameters) — so both shapes have to be readable to tell the two apart.
const hrefOf = (target: unknown): string =>
  target instanceof URL ? target.href : (target as string)

const YOUTUBE_URL = 'https://www.youtube.com/watch?v=qkdXAtO40Fo'
const PLAIN_URL = 'https://ocelot.social/post/1234/some-slug'

// Answers the page request with `html` and the oEmbed request with `oembed`, dispatching on the
// target instead of on call order — the two fetches are started by `Promise.all` and only their
// *start* is ordered.
const respondWith = ({ html, oembed }: { html: string; oembed?: () => Promise<FetchResponse> }) => {
  mockedFetch.mockImplementation(async (target) => {
    const href = hrefOf(target)
    if (href.includes('/oembed')) {
      if (!oembed) {
        throw new Error(`unexpected oEmbed request to ${href}`)
      }
      return await oembed()
    }
    await Promise.resolve()
    return new Response(html)
  })
}

// The `await` before answering is deliberate: a real HTTP response arrives on a later tick, so
// `scrape` is exercised across that suspension rather than running through synchronously.
const responds = (body: unknown) => async (): Promise<FetchResponse> => {
  await Promise.resolve()
  return new Response(typeof body === 'string' ? body : JSON.stringify(body))
}

const failingRequest = async (): Promise<FetchResponse> => {
  await Promise.resolve()
  throw new Error('ECONNREFUSED')
}

const oEmbedRequest = () =>
  mockedFetch.mock.calls.map((call) => hrefOf(call[0])).find((href) => href.includes('/oembed'))

beforeEach(() => {
  mockedFetch.mockReset()
})

afterEach(() => {
  vi.mocked(fetch).mockReset()
})

describe('scrape', () => {
  // The plain case: a link nobody offers an oEmbed for still has to produce a preview, built from
  // the page's own metadata. `findProvider` returns null here, and the resolver must not send the
  // user's URL to an unrelated provider's API just to find that out.
  it('builds a preview from page metadata alone', async () => {
    respondWith({
      html: page(`
        <meta property="og:title" content="A post about cats" />
        <meta property="og:description" content="They are fine animals." />
        <meta property="og:site_name" content="Ocelot" />
      `),
    })

    const result = (await scrape(PLAIN_URL)) as Record<string, unknown>

    expect(result.title).toBe('A post about cats')
    expect(result.description).toBe('They are fine animals.')
    expect(result.sources).toEqual(['resource'])
    expect(mockedFetch).toHaveBeenCalledTimes(1)
  })

  // `type` is what the webapp switches the preview on. Metascraper does not produce one, so
  // without the default every non-video link would render as an embed of unknown type.
  it('defaults the type to link', async () => {
    respondWith({ html: page('<title>Plain</title>') })

    const result = (await scrape(PLAIN_URL)) as Record<string, unknown>

    expect(result.type).toBe('link')
  })

  describe('with an oEmbed provider', () => {
    // Both query parameters matter: without `url` the endpoint has nothing to resolve, and
    // without `format=json` several providers answer XML — which `response.json()` then rejects,
    // silently degrading every embed of that provider to a plain link.
    it('asks the provider endpoint for JSON about this url', async () => {
      respondWith({
        html: page('<title>Baby Loves Cat</title>'),
        oembed: responds({}),
      })

      await scrape(YOUTUBE_URL)

      const requested = new URL(oEmbedRequest() ?? '')

      expect(requested.origin + requested.pathname).toBe('https://www.youtube.com/oembed')
      expect(requested.searchParams.get('url')).toBe(YOUTUBE_URL)
      expect(requested.searchParams.get('format')).toBe('json')
    })

    // The two sources answer different questions — the page says what the link is about, the
    // provider hands over the player markup — so the result is a merge, and `sources` records
    // which of them contributed. The array concatenation is the reason `mergeWith` has a
    // customizer at all; plain merge would replace ['resource'] with ['oembed'].
    it('merges the provider payload over the page metadata', async () => {
      respondWith({
        html: page(`
          <meta property="og:title" content="Baby Loves Cat" />
          <meta property="og:description" content="She is incapable of controlling her limbs." />
        `),
        oembed: responds({
          type: 'video',
          html: '<iframe src="https://www.youtube.com/embed/qkdXAtO40Fo"></iframe>',
          author_name: 'Merkley Family',
          upload_date: '2019-09-01',
        }),
      })

      const result = (await scrape(YOUTUBE_URL)) as Record<string, unknown>

      expect(result.type).toBe('video')
      expect(result.html).toBe('<iframe src="https://www.youtube.com/embed/qkdXAtO40Fo"></iframe>')
      expect(result.author).toBe('Merkley Family')
      expect(result.date).toBe('2019-09-01')
      expect(result.title).toBe('Baby Loves Cat')
      expect(result.sources).toEqual(['resource', 'oembed'])
    })
  })

  describe('when the provider fails', () => {
    // A third-party API being down, rate-limiting or answering something else must not take the
    // preview with it: the page metadata is already there, and it is what the user sees. The
    // failure is logged through `debug`, not raised.
    it.each([
      ['the request fails', failingRequest],
      ['the response is not JSON', responds('<html>rate limited</html>')],
    ])('still returns the page metadata when %s', async (_name, oembed) => {
      respondWith({
        html: page('<meta property="og:title" content="Baby Loves Cat" />'),
        oembed,
      })

      const result = (await scrape(YOUTUBE_URL)) as Record<string, unknown>

      expect(result.title).toBe('Baby Loves Cat')
      expect(result.type).toBe('link')
      expect(result.sources).toEqual(['resource'])
    })
  })

  // The page fetch has no such rescue, deliberately: if the target itself is unreachable there is
  // nothing to preview, and the resolver has to surface an error rather than store an empty embed.
  it('propagates a failure to reach the page itself', async () => {
    mockedFetch.mockRejectedValue(new Error('ENOTFOUND'))

    await expect(scrape(PLAIN_URL)).rejects.toThrow('ENOTFOUND')
  })
})
