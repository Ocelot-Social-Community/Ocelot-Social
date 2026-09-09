/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */

/* eslint-disable @typescript-eslint/no-shadow */
import fs from 'node:fs'
import path from 'node:path'

import { beforeAll, afterAll, afterEach, describe, it, expect, beforeEach } from 'vitest'

import type { ApolloTestSetup } from '@root/test/helpers'

// `vi.mock` IS hoisted, so the order of these lines does not decide what they see — the factory
// has to hand out the real `Response` itself. vi.importActual is the supported way to reach past
// one's own mock; the pre-mock import this file used under Jest would now bind the mock.
vi.mock('node-fetch', async () => ({
  ...(await vi.importActual<object>('node-fetch')),
  default: vi.fn(),
}))

const { default: fetch, Response } = await import('node-fetch')
const { default: embed } = await import('@graphql/queries/embed.gql')
const { default: embedProviders } = await import('@graphql/queries/embedProviders.gql')
const { createApolloTestSetup } = await import('@root/test/helpers')
const { default: embedsResolvers } = await import('./embeds')
const mockedFetch = vi.mocked(fetch)

let query: ApolloTestSetup['query']
let database: ApolloTestSetup['database']
let server: ApolloTestSetup['server']
let variables = {}

beforeAll(async () => {
  const apolloSetup = await createApolloTestSetup({ context: () => ({}) })
  query = apolloSetup.query
  database = apolloSetup.database
  server = apolloSetup.server
})

afterAll(() => {
  void server.stop()
  void database.driver.close()
  database.neode.close()
})

afterEach(() => {
  mockedFetch.mockRestore()
})

// eslint-disable-next-line n/no-sync
const HumanConnectionOrg = fs.readFileSync(
  path.join(import.meta.dirname, '../../../snapshots/embeds/HumanConnectionOrg.html'),
  'utf8',
)
// eslint-disable-next-line n/no-sync
const pr3934 = fs.readFileSync(
  path.join(import.meta.dirname, '../../../snapshots/embeds/pr3934.html'),
  'utf8',
)
// eslint-disable-next-line n/no-sync
const babyLovesCat = fs.readFileSync(
  path.join(import.meta.dirname, '../../../snapshots/embeds/babyLovesCat.html'),
  'utf8',
)

const babyLovesCatEmbedResponse = new Response(
  JSON.stringify({
    height: 270,
    provider_name: 'YouTube',
    title: 'Baby Loves Cat',
    type: 'video',
    width: 480,
    thumbnail_height: 360,
    provider_url: 'https://www.youtube.com/',
    thumbnail_width: 480,
    html: '<iframe width="480" height="270" src="https://www.youtube.com/embed/qkdXAtO40Fo?start=18&feature=oembed" frameborder="0" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>',
    thumbnail_url: 'https://i.ytimg.com/vi/qkdXAtO40Fo/hqdefault.jpg',
    version: '1.0',
    author_name: 'Merkley Family',
    author_url: 'https://www.youtube.com/channel/UC5P8yei950tif7UmdPpkJLQ',
  }),
)

describe('Query', () => {
  describe('embedProviders', () => {
    // Public and unauthenticated (the shield lists it next to `embed`): the settings page reads the
    // list this way since the backend stopped serving public/providers.json over HTTP.
    it('returns the oEmbed provider list', async () => {
      const result = (await query({ query: embedProviders, variables: {} })) as {
        errors?: unknown
        data?: { embedProviders: Array<{ name: string; url: string }> }
      }

      expect(result.errors).toBeUndefined()

      const providers = result.data?.embedProviders ?? []

      // The curated list this instance actually matches against, not the full oembed.com registry.
      expect(providers).toContainEqual({ name: 'YouTube', url: 'https://www.youtube.com/' })
      expect(providers).toContainEqual({ name: 'Vimeo', url: 'https://vimeo.com/' })
      expect(providers).toHaveLength(16)
      // Identity only — the matching endpoints stay server-side.
      expect(Object.keys(providers[0]).sort()).toEqual(['name', 'url'])
    })
  })

  describe('embed', () => {
    let embedAction

    beforeEach(() => {
      embedAction = async (variables) => {
        return query({ query: embed, variables })
      }
    })

    describe('given a video link', () => {
      beforeEach(() => {
        mockedFetch
          .mockResolvedValueOnce(new Response(''))
          .mockResolvedValueOnce(new Response(JSON.stringify({})))
        variables = { url: 'https://www.w3schools.com/html/mov_bbb.mp4' }
      })

      it('shows some default data', async () => {
        await expect(embedAction(variables)).resolves.toMatchObject({
          data: {
            embed: {
              audio: null,
              author: null,
              date: null,
              description: null,
              html: null,
              image: null,
              lang: 'false',
              publisher: null,
              sources: ['resource'],
              title: null,
              type: 'link',
              url: 'https://www.w3schools.com/html/mov_bbb.mp4',
              video: null,
            },
          },
          errors: undefined,
        })
      })
    })

    describe('given a Facebook link', () => {
      beforeEach(() => {
        mockedFetch
          .mockResolvedValueOnce(new Response(HumanConnectionOrg))
          .mockResolvedValueOnce(new Response('invalid json'))
        variables = { url: 'https://www.facebook.com/HumanConnectionOrg/' }
      })

      it('does not crash if embed provider returns invalid JSON', async () => {
        await expect(embedAction(variables)).resolves.toMatchObject({
          data: {
            embed: {
              audio: null,
              author: null,
              date: expect.any(String),
              description:
                'Human Connection, Weilheim an der Teck. Gefällt 24.407 Mal. An upcoming non-profit social network focused on local and global positive change. Twitter accounts : @hc_world (EN), @hc_deutschland (GE),…',
              html: null,
              image:
                'https://scontent.ftxl3-1.fna.fbcdn.net/v/t1.0-1/c5.0.200.200a/p200x200/12108307_997373093648222_70057205881020137_n.jpg?_nc_cat=110&_nc_oc=AQnPPYQlR0dU556gOfl4xkXr7IPZdRIAUfQeXl3fpUv4DAsFN8T4PfgOjPwuq85GPKGZ5S5E5mWQ8IVV1UiRBAIZ&_nc_ht=scontent.ftxl3-1.fna&oh=90309adddaab38839782f16e7d4b7bcf&oe=5DEEDFE5',
              lang: 'de',
              publisher: 'Facebook',
              sources: ['resource'],
              title: 'Human Connection',
              type: 'link',
              url: 'https://www.facebook.com/HumanConnectionOrg/',
              video: null,
            },
          },
          errors: undefined,
        })
      })
    })

    describe('given a Github link', () => {
      beforeEach(() => {
        mockedFetch
          .mockResolvedValueOnce(new Response(pr3934))
          .mockResolvedValueOnce(new Response(JSON.stringify({})))
        variables = { url: 'https://github.com/Human-Connection/Human-Connection/pull/960' }
      })

      it('returns meta data even if no embed html can be retrieved', async () => {
        await expect(embedAction(variables)).resolves.toMatchObject({
          data: {
            embed: {
              type: 'link',
              title:
                'feat: [WIP] 🍰 Rebranding And White-Labeling by Mogge · Pull Request #3934 · Ocelot-Social-Community/Ocelot-Social',
              author: 'Ocelot-Social-Community',
              publisher: 'GitHub',
              date: expect.any(String),
              description: `🍰 Pullrequest
Have all the information for the brand in separate config files. Set these defaults to ocelot.social`,
              url: 'https://github.com/Ocelot-Social-Community/Ocelot-Social/pull/3934',
              image: 'https://avatars3.githubusercontent.com/u/67983243?s=400&v=4',
              audio: null,
              video: null,
              lang: 'en',
              sources: ['resource'],
              html: null,
            },
          },
          errors: undefined,
        })
      })
    })

    describe('given a youtube link', () => {
      beforeEach(() => {
        mockedFetch
          .mockResolvedValueOnce(new Response(babyLovesCat))
          .mockResolvedValueOnce(babyLovesCatEmbedResponse)
        variables = { url: 'https://www.youtube.com/watch?v=qkdXAtO40Fo&t=18s' }
      })

      it('returns meta data plus youtube iframe html', async () => {
        await expect(embedAction(variables)).resolves.toMatchObject({
          data: {
            embed: {
              type: 'video',
              title: 'Baby Loves Cat',
              author: 'Merkley Family',
              publisher: 'YouTube',
              date: expect.any(String),
              description:
                'She’s incapable of controlling her limbs when her kitty is around. The obsession grows every day. Ps. That’s a sleep sack she’s in. Not a starfish outfit. Al…',
              url: 'https://www.youtube.com/watch?v=qkdXAtO40Fo',
              image: 'https://i.ytimg.com/vi/qkdXAtO40Fo/maxresdefault.jpg',
              audio: null,
              video: null,
              lang: 'de',
              sources: ['resource', 'oembed'],
              html: '<iframe width="480" height="270" src="https://www.youtube.com/embed/qkdXAtO40Fo?start=18&feature=oembed" frameborder="0" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>',
            },
          },
          errors: undefined,
        })
      })
    })
  })
})

// `Embed.sources` is a non-null LIST, and the scraper only sets it when at least one source
// contributed. GraphQL's default resolver would answer `null` for the missing key and fail the
// whole Embed — a link preview that came back with nothing to say must degrade to `[]`, not take
// the query down with it.
describe('Embed.sources', () => {
  it.each([
    ['a scrape that reported no sources', {}, []],
    ['a scrape that reported some', { sources: ['oembed'] }, ['oembed']],
  ])('resolves %s', async (_name, parent, expected) => {
    await expect(embedsResolvers.Embed.sources(parent, {}, null, null)).resolves.toEqual(expected)
  })
})
