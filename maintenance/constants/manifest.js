import metadata from './metadata.js'
const { APPLICATION_NAME, APPLICATION_SHORT_NAME, APPLICATION_DESCRIPTION, THEME_COLOR } = metadata

export default {
  name: APPLICATION_NAME,
  short_name: APPLICATION_SHORT_NAME,
  description: APPLICATION_DESCRIPTION,
  theme_color: THEME_COLOR,
  lang: 'en',
}
