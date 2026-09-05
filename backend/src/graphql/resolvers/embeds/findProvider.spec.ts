import { describe, it, expect } from 'vitest'

import findProvider, { embedProviders } from './findProvider'

describe('Vimeo', () => {
  it('matches `https://vimeo.com/showcase/2098620/video/4082288`', () => {
    expect(findProvider('https://vimeo.com/showcase/2098620/video/4082288')).toEqual(
      'https://vimeo.com/api/oembed.json',
    )
  })
})

describe('D.Tube', () => {
  it('matches `https://d.tube/v/alexshumsky/q4D-hIOjknY`', () => {
    expect(findProvider('https://d.tube/v/alexshumsky/q4D-hIOjknY')).toEqual(
      'https://api.d.tube/oembed',
    )
  })
})

describe('GIPHY', () => {
  it('matches `https://giphy.com/gifs/KRB0DCpSFQeT6/html5`', () => {
    expect(findProvider('https://giphy.com/gifs/KRB0DCpSFQeT6/html5')).toEqual(
      'https://giphy.com/services/oembed',
    )
  })
})

describe('Flicker', () => {
  it('matches `https://flic.kr/p/VT2HCQ`', () => {
    expect(findProvider('https://flic.kr/p/VT2HCQ')).toBe('https://www.flickr.com/services/oembed/')
  })
})

describe('Codepen', () => {
  it('matches `https://codepen.io/goodkatz/pen/LYPGxQz`', () => {
    expect(findProvider('https://codepen.io/goodkatz/pen/LYPGxQz')).toEqual(
      'http://codepen.io/api/oembed',
    )
  })
})

describe('Meetup', () => {
  it('matches `https://www.meetup.com/de-DE/spielego/events/ctdplqyzmbfc/`', () => {
    expect(findProvider('https://www.meetup.com/de-DE/spielego/events/ctdplqyzmbfc/')).toEqual(
      'https://api.meetup.com/oembed',
    )
  })
})

describe('Mixcloud', () => {
  it('matches `https://www.mixcloud.com/diffrent/giraffecast025/`', () => {
    expect(findProvider('https://www.mixcloud.com/diffrent/giraffecast025/')).toEqual(
      'https://www.mixcloud.com/oembed/',
    )
  })
})

describe('Reddit', () => {
  it('matches `https://www.reddit.com/r/LivestreamFail/comments/d6a2ge/greek_banned/`', () => {
    expect(
      findProvider('https://www.reddit.com/r/LivestreamFail/comments/d6a2ge/greek_banned/'),
    ).toBe('https://www.reddit.com/oembed')
  })
})

describe('Slideshare', () => {
  it('matches `https://www.slideshare.net/ma6/lets-build-an-airport-how-to-estimate-large-scale-projects`', () => {
    expect(
      findProvider(
        'https://www.slideshare.net/ma6/lets-build-an-airport-how-to-estimate-large-scale-projects',
      ),
    ).toBe('http://www.slideshare.net/api/oembed/2')
  })
})

describe('Soundcloud', () => {
  it('matches `https://soundcloud.com/placid-records/zangenhand-live-altes-wettb-ro`', () => {
    expect(
      findProvider('https://soundcloud.com/placid-records/zangenhand-live-altes-wettb-ro'),
    ).toBe('https://soundcloud.com/oembed')
  })
})

describe('Twitch', () => {
  it('matches `https://www.twitch.tv/gtimetv`', () => {
    expect(findProvider('https://www.twitch.tv/gtimetv')).toEqual('https://api.twitch.tv/v4/oembed')
  })
})

describe('Twitter', () => {
  it('matches `https://twitter.com/kenfm/status/1168682881524232194`', () => {
    expect(findProvider('https://twitter.com/kenfm/status/1168682881524232194')).toEqual(
      'https://publish.twitter.com/oembed',
    )
  })
})

describe('Facebook', () => {
  it('matches `https://www.facebook.com/FacebookDeutschland/videos/1960353927603280/`', () => {
    expect(
      findProvider('https://www.facebook.com/FacebookDeutschland/videos/1960353927603280/'),
    ).toBe('https://www.facebook.com/plugins/post/oembed.json')
  })
})

describe('Youtube', () => {
  it('matches `https://www.youtube.com/watch?v=qkdXAtO40Fo`', () => {
    expect(findProvider('https://www.youtube.com/watch?v=qkdXAtO40Fo')).toEqual(
      'https://www.youtube.com/oembed',
    )
  })

  it('matches `https://youtu.be/qkdXAtO40Fo`', () => {
    expect(findProvider(`https://youtu.be/qkdXAtO40Fo`)).toEqual('https://www.youtube.com/oembed')
  })

  it('matches `https://youtu.be/qkdXAtO40Fo?t=41`', () => {
    expect(findProvider(`https://youtu.be/qkdXAtO40Fo?t=41`)).toBe('https://www.youtube.com/oembed')
  })
})

describe('unknown providers', () => {
  // The caller (`fetchEmbed` in scraper.ts) branches on `if (!endpointUrl) return {}` and then
  // falls back to plain metadata scraping. Returning anything but null for a link nobody
  // provides oEmbed for would send the user's URL to an unrelated provider's API.
  it('returns null for a link no provider claims', () => {
    expect(findProvider('https://ocelot.social/post/1234/some-slug')).toBeNull()
  })

  // No provider matched means the hostname fallback ran, and that needs a parsable URL. A term
  // without a scheme — what a user typing `vimeo.com/12345` into the embed field produces —
  // throws out of the resolver instead of degrading to the null path above.
  it('throws on input that is not an absolute URL', () => {
    expect(() => {
      findProvider('vimeo.com/12345')
    }).toThrow(TypeError)
  })
})

describe(embedProviders, () => {
  // What the `embedProviders` query returns is rendered by the embeds settings page. The oEmbed
  // endpoints are deliberately NOT part of it: they are call targets for the backend, and an
  // extra key here would publish the full endpoint list of every provider to anyone.
  it('exposes provider identity only', () => {
    const providers = embedProviders()

    expect(providers).toContainEqual({ name: 'Codepen', url: 'https://codepen.io' })

    for (const provider of providers) {
      expect(Object.keys(provider).sort()).toEqual(['name', 'url'])
    }
  })

  // providers.json is hand-maintained, and both fields are non-nullable in the schema. A missing
  // provider_name/provider_url would otherwise reach the settings page as an empty row (or a
  // GraphQL null error) rather than failing here.
  it('reports a name and a url for every provider', () => {
    for (const provider of embedProviders()) {
      expect(provider.name).toBeTruthy()
      expect(provider.url).toBeTruthy()
    }
  })

  // The point of serving the list from this module rather than from a second copy: every
  // provider the settings page advertises must be one that link previews actually resolve. An
  // entry whose provider_url no longer matches any endpoint would promise an embed that silently
  // never happens.
  it('advertises only providers that findProvider resolves', () => {
    for (const provider of embedProviders()) {
      expect(findProvider(provider.url)).toEqual(expect.any(String))
    }
  })
})
