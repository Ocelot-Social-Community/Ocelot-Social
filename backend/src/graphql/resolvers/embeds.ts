/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { embedProviders } from './embeds/findProvider'
import scrape from './embeds/scraper'
import { undefinedToNullResolver } from './helpers/Resolver'

export default {
  Query: {
    embed: async (_object, { url }, _context, _resolveInfo) => {
      return scrape(url)
    },
    // The settings page used to fetch backend/public/providers.json over the /api proxy. The file is
    // resolver data, not a served asset, so it is read here and the backend serves no static files at
    // all any more.
    embedProviders: async (_object, _params, _context, _resolveInfo) => {
      return embedProviders()
    },
  },
  Embed: {
    ...undefinedToNullResolver([
      'type',
      'title',
      'author',
      'publisher',
      'date',
      'description',
      'url',
      'image',
      'audio',
      'video',
      'lang',
      'html',
    ]),
    sources: async (parent, _params, _context, _resolveInfo) => {
      return typeof parent.sources === 'undefined' ? [] : parent.sources
    },
  },
}
