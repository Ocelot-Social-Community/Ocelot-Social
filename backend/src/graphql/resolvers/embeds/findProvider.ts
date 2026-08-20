/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import fs from 'node:fs'
import path from 'node:path'

import { minimatch } from 'minimatch'

// Next to this module, not in a served directory: the list is resolver DATA, and the only other
// consumer (the embeds settings page) reads it through the `embedProviders` query rather than over
// HTTP. Copied into the build by scripts/build.copy.files.sh, like the .gql files.
// eslint-disable-next-line n/no-sync
let oEmbedProvidersFile = fs.readFileSync(path.join(__dirname, 'providers.json'), 'utf8')

// some providers allow a format parameter
// we need JSON
oEmbedProvidersFile = oEmbedProvidersFile.replace(/\{format\}/g, 'json')
const oEmbedProviders = JSON.parse(oEmbedProvidersFile)

/**
 * The providers as the API exposes them: identity only, no endpoints. Same parsed list this module
 * matches against, so the settings page can never advertise a provider that link previews would not
 * actually resolve.
 */
export const embedProviders = (): Array<{ name: string; url: string }> =>
  oEmbedProviders.map((provider) => ({
    name: provider.provider_name,
    url: provider.provider_url,
  }))

export default function (embedUrl) {
  for (const provider of oEmbedProviders) {
    for (const endpoint of provider.endpoints) {
      const { schemes = [], url } = endpoint
      if (schemes.some((scheme) => minimatch(embedUrl, scheme))) {
        return url
      }
    }
    const { hostname } = new URL(embedUrl)
    if (provider.provider_url.includes(hostname)) {
      const {
        endpoints: [{ url }],
      } = provider
      return url
    }
  }
  return null
}
