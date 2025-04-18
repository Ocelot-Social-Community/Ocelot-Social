/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable n/no-extraneous-require */
/* eslint-disable n/global-require */
/* eslint-disable import/no-commonjs */
/* eslint-disable import/no-named-as-default */

import { ApolloError } from 'apollo-server'
import isArray from 'lodash/isArray'
import isEmpty from 'lodash/isEmpty'
import mergeWith from 'lodash/mergeWith'
import Metascraper from 'metascraper'
import fetch from 'node-fetch'

import findProvider from './findProvider'

// eslint-disable-next-line import/no-extraneous-dependencies
const error = require('debug')('embed:error')

const metascraper = Metascraper([
  require('metascraper-author')(),
  require('metascraper-date')(),
  require('metascraper-description')(),
  require('metascraper-image')(),
  require('metascraper-lang')(),
  require('metascraper-lang-detector')(),
  require('metascraper-logo')(),
  require('metascraper-publisher')(),
  require('metascraper-title')(),
  require('metascraper-url')(),
  require('metascraper-soundcloud')(),
  require('metascraper-video')(),
  require('metascraper-youtube')(),

  // require('./rules/metascraper-embed')()
])

const fetchEmbed = async (url) => {
  let endpointUrl = findProvider(url)
  if (!endpointUrl) return {}
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

  if (isEmpty(output)) {
    throw new ApolloError('Not found', 'NOT_FOUND')
  }

  return {
    type: 'link',
    ...output,
  }
}
