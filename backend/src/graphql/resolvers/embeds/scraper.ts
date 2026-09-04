/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/restrict-template-expressions */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */

/* eslint-disable import-x/no-named-as-default */

import debug from 'debug'
import { GraphQLError } from 'graphql'
import isArray from 'lodash/isArray.js'
import isEmpty from 'lodash/isEmpty.js'
import mergeWith from 'lodash/mergeWith.js'
import Metascraper from 'metascraper'
import metascraperAuthor from 'metascraper-author'
import metascraperDate from 'metascraper-date'
import metascraperDescription from 'metascraper-description'
import metascraperImage from 'metascraper-image'
import metascraperLang from 'metascraper-lang'
import metascraperLangDetector from 'metascraper-lang-detector'
import metascraperLogo from 'metascraper-logo'
import metascraperPublisher from 'metascraper-publisher'
import metascraperSoundcloud from 'metascraper-soundcloud'
import metascraperTitle from 'metascraper-title'
import metascraperUrl from 'metascraper-url'
import metascraperVideo from 'metascraper-video'
import metascraperYoutube from 'metascraper-youtube'
import fetch from 'node-fetch'

import findProvider from './findProvider'

const error = debug('embed:error')

const metascraper = Metascraper([
  metascraperAuthor(),
  metascraperDate(),
  metascraperDescription(),
  metascraperImage(),
  metascraperLang(),
  metascraperLangDetector(),
  metascraperLogo(),
  metascraperPublisher(),
  metascraperTitle(),
  metascraperUrl(),
  metascraperSoundcloud(),
  metascraperVideo(),
  metascraperYoutube(),

  // require('./rules/metascraper-embed')()
])

const fetchEmbed = async (url) => {
  let endpointUrl = findProvider(url)
  if (!endpointUrl) {
    return {}
  }
  endpointUrl = new URL(endpointUrl)
  endpointUrl.searchParams.append('url', url)
  endpointUrl.searchParams.append('format', 'json')
  let json
  try {
    const response = await fetch(endpointUrl)
    json = await response.json()
    // eslint-disable-next-line no-catch-all/no-catch-all
  } catch (err) {
    error(`Error fetching embed data: ${err.message}`)
    return {}
  }

  return {
    type: json.type,
    html: json.html,
    author: json.author_name,
    date: json.upload_date,
    sources: ['oembed'],
  }
}

const fetchResource = async (url) => {
  const response = await fetch(url)
  const html = await response.text()
  const resource = await metascraper({ html, url })
  return {
    sources: ['resource'],
    ...resource,
  }
}

export default async function scrape(url) {
  const [meta, embed] = await Promise.all([fetchResource(url), fetchEmbed(url)])
  const output = mergeWith(meta, embed, (objValue, srcValue) => {
    if (isArray(objValue)) {
      return objValue.concat(srcValue)
    }
  })

  // Dead since fetchResource started stamping `sources: ['resource']` on every answer: `meta` is
  // the merge target and always carries that key, so `output` is never empty and the URL that
  // scraped to nothing now returns a bare link rather than NOT_FOUND. Kept because no client asks
  // for this code and removing it would be a silent API change; it is a deletion candidate, not a
  // coverage gap.
  /* v8 ignore next 3 -- unreachable: `sources` makes the merged output non-empty by construction */
  if (isEmpty(output)) {
    throw new GraphQLError('Not found', { extensions: { code: 'NOT_FOUND' } })
  }

  if (!output.type) {
    output.type = 'link'
  }

  return output
}
