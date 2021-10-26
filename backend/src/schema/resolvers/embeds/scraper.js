import Metascraper from 'metascraper'
import fetch from 'node-fetch'

import { ApolloError } from 'apollo-server'
import isEmpty from 'lodash/isEmpty'
import isArray from 'lodash/isArray'
import mergeWith from 'lodash/mergeWith'
import findProvider from './findProvider'

const error = require('debug')('embed:error')

const metascraper = Metascraper([
  require('metascraper-author')(),
  require('metascraper-date')(),
  require('metascraper-description')(),
  require('metascraper-image')(),
  require('metascraper-lang')(),
  require('metascraper-lang-detector')(),
  require('metascraper-logo')(),
  // require('metascraper-clearbit-logo')(),
  require('metascraper-publisher')(),
  require('metascraper-title')(),
  require('metascraper-url')(),
  require('metascraper-audio')(),
  require('metascraper-soundcloud')(),
  require('metascraper-video')(),
  require('metascraper-youtube')(),

  // require('./rules/metascraper-embed')()
])

import axios from 'axios'



const fetchEmbed = async (url) => {
  console.log("---------3 resolvers/embeds/scraper.js fetchEmbed")
  let endpointUrl = findProvider(url)
  if (!endpointUrl) return {}
  endpointUrl = new URL(endpointUrl)
  endpointUrl.searchParams.append('url', url)
  endpointUrl.searchParams.append('format', 'json')
  let json
  try {
    console.log("--------- resolvers/embeds/scraper.js endpointUrl", endpointUrl)
    const response = await fetch(endpointUrl)
    json = await response.json()
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
  console.log("-----------2 backend/src/schema/resolvers/embeds/scraper.js fetchResource = async")
  const response = await fetch(url)
  console.log(" ------------2.1  response")

  const html = await response.text()
  //console.log("const html => ", html)
 
  const resource = await metascraper({ html, url })
  return {
    sources: ['resource'],
    ...resource
  }
}

export default async function scrape(url) {
  console.log("-----------1 backend/src/schema/resolvers/embeds/scraper.js scrape()", url)

  const [meta, embed] = await Promise.all([fetchResource(url), fetchEmbed(url)])

  console.log("Object.keys(meta).length) => ", Object.keys(meta).length)
  console.log("Object.keys(embed).length) => ", Object.keys(embed).length)
   /*
  if ( Object.keys(embed).length === 0 ) { 


  const resAxios =  await axios.get(url)
    .then(function (res) {
      // handle success
      console.log(" - ------------------------------ resAxios response")
      console.log(res.headers['content-type']);
      return res.headers['content-type']
      
      //console.log(response.headers);
      
    })
    .catch(function (error) {
      // handle error
      console.log("resAxios error",error);
    })

    console.log(">>>>>>>>>>>>>>>> EMBED === '' ")
    if (resAxios === 'audio/mpeg') { 
      console.log(">>>>>>>>>>> IF MPEG ")
    } else { 
      console.log(">>>>>>>>>>> IF NOT A MPEG ")
    }

   }
*/
 
 

  
  const output = mergeWith(meta, embed, (objValue, srcValue) => {
    console.log("------------ output objValue ", objValue);
    console.log("------------ output  srcValue", srcValue);
    if (isArray(objValue)) {
      return objValue.concat(srcValue)
    }
  })

  if (isEmpty(output)) {
    console.log("------------ NOT FOUND output");
    throw new ApolloError('Not found', 'NOT_FOUND')
  }
  console.log("-----------5 backend/src/schema/resolvers/embeds/scraper.js retrun ")

  //if (res.headers['content-type'] === 'audio/mpeg'){
  //  console.log("-----------1 SSSUUUCCEESSSSS")

  //}else {
    return {
    
      type: 'link',
      ...output,
    }
  //}
 
 
}
