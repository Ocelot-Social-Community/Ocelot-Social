import { describe, it, expect } from 'vitest'

import findProvider from './findProvider'

describe('vimeo', () => {
  it('matches `https://vimeo.com/showcase/2098620/video/4082288`', () => {
    expect(findProvider('https://vimeo.com/showcase/2098620/video/4082288')).toEqual(
      'https://vimeo.com/api/oembed.json',
    )
  })
})

describe('d.Tube', () => {
  it('matches `https://d.tube/v/alexshumsky/q4D-hIOjknY`', () => {
    expect(findProvider('https://d.tube/v/alexshumsky/q4D-hIOjknY')).toEqual(
      'https://api.d.tube/oembed',
    )
  })
})

describe('gIPHY', () => {
  it('matches `https://giphy.com/gifs/KRB0DCpSFQeT6/html5`', () => {
    expect(findProvider('https://giphy.com/gifs/KRB0DCpSFQeT6/html5')).toEqual(
      'https://giphy.com/services/oembed',
    )
  })
})

describe('flicker', () => {
  it('matches `https://flic.kr/p/VT2HCQ`', () => {
    expect(findProvider('https://flic.kr/p/VT2HCQ')).toBe('https://www.flickr.com/services/oembed/')
  })
})

describe('codepen', () => {
  it('matches `https://codepen.io/goodkatz/pen/LYPGxQz`', () => {
    expect(findProvider('https://codepen.io/goodkatz/pen/LYPGxQz')).toEqual(
      'http://codepen.io/api/oembed',
    )
  })
})

describe('meetup', () => {
  it('matches `https://www.meetup.com/de-DE/spielego/events/ctdplqyzmbfc/`', () => {
    expect(findProvider('https://www.meetup.com/de-DE/spielego/events/ctdplqyzmbfc/')).toEqual(
      'https://api.meetup.com/oembed',
    )
  })
})

describe('mixcloud', () => {
  it('matches `https://www.mixcloud.com/diffrent/giraffecast025/`', () => {
    expect(findProvider('https://www.mixcloud.com/diffrent/giraffecast025/')).toEqual(
      'https://www.mixcloud.com/oembed/',
    )
  })
})

describe('reddit', () => {
  it('matches `https://www.reddit.com/r/LivestreamFail/comments/d6a2ge/greek_banned/`', () => {
    expect(
      findProvider('https://www.reddit.com/r/LivestreamFail/comments/d6a2ge/greek_banned/'),
    ).toBe('https://www.reddit.com/oembed')
  })
})

describe('slideshare', () => {
  it('matches `https://www.slideshare.net/ma6/lets-build-an-airport-how-to-estimate-large-scale-projects`', () => {
    expect(
      findProvider(
        'https://www.slideshare.net/ma6/lets-build-an-airport-how-to-estimate-large-scale-projects',
      ),
    ).toBe('http://www.slideshare.net/api/oembed/2')
  })
})

describe('soundcloud', () => {
  it('matches `https://soundcloud.com/placid-records/zangenhand-live-altes-wettb-ro`', () => {
    expect(
      findProvider('https://soundcloud.com/placid-records/zangenhand-live-altes-wettb-ro'),
    ).toBe('https://soundcloud.com/oembed')
  })
})

describe('twitch', () => {
  it('matches `https://www.twitch.tv/gtimetv`', () => {
    expect(findProvider('https://www.twitch.tv/gtimetv')).toEqual('https://api.twitch.tv/v4/oembed')
  })
})

describe('twitter', () => {
  it('matches `https://twitter.com/kenfm/status/1168682881524232194`', () => {
    expect(findProvider('https://twitter.com/kenfm/status/1168682881524232194')).toEqual(
      'https://publish.twitter.com/oembed',
    )
  })
})

describe('facebook', () => {
  it('matches `https://www.facebook.com/FacebookDeutschland/videos/1960353927603280/`', () => {
    expect(
      findProvider('https://www.facebook.com/FacebookDeutschland/videos/1960353927603280/'),
    ).toBe('https://www.facebook.com/plugins/post/oembed.json')
  })
})

describe('youtube', () => {
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
