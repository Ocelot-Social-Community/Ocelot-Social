import metadata from './metadata.js'
const { APPLICATION_NAME, APPLICATION_SHORT_NAME, APPLICATION_DESCRIPTION } = metadata
export default {
  name: APPLICATION_NAME,
  short_name: APPLICATION_SHORT_NAME,
  description: APPLICATION_DESCRIPTION,
  theme_color: '#17b53f',
  lang: 'en',
}
