/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { embedProviders } from './embeds/findProvider'
import scrape from './embeds/scraper'

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
    // No per-field `undefined -> null` mapping here: that is what GraphQL's default
    // resolver already does for a nullable field. `sources` is the exception — it is a
    // LIST, where the default would yield null rather than an empty array.
    sources: async (parent, _params, _context, _resolveInfo) => {
      return typeof parent.sources === 'undefined' ? [] : parent.sources
    },
  },
}
