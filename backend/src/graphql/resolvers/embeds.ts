/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import scrape from './embeds/scraper'
import { undefinedToNullResolver } from './helpers/Resolver'

export default {
  Query: {
    embed: async (_object, { url }, _context, _resolveInfo) => {
      return scrape(url)
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
