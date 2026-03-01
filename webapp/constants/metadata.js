// this file is duplicated in `backend/src/config/metadata.js` and `webapp/constants/metadata.js` and replaced on rebranding
export default {
  APPLICATION_NAME: 'Nutriminds.net',
  APPLICATION_SHORT_NAME: 'Nutriminds',
  APPLICATION_DESCRIPTION: 'Quorum sensing for experts',
  COOKIE_NAME: 'ocelot-social-token',
  ORGANIZATION_NAME: 'Dioscurides e.V.',
  ORGANIZATION_JURISDICTION: 'Schweiz',
  THEME_COLOR: 'rgb(61, 122, 182)', // $color-primary – as the main color in general. e.g. the color in the background of the app that is visible behind the transparent iPhone status bar to name one use case, or the current color of SVGs to name another use case
  OG_IMAGE: 'https://os.nutriminds.net/img/custom/logo-squared.png', // Open Graph image for link previews (Telegram, Discord, etc.) – relative URL, override with absolute URL in branding
  OG_IMAGE_ALT: 'ocelot.social Logo', // alt text for the Open Graph image
  OG_IMAGE_WIDTH: '1200', // width of the Open Graph image in pixels
  OG_IMAGE_HEIGHT: '1140', // height of the Open Graph image in pixels
  OG_IMAGE_TYPE: 'image/png', // MIME type of the Open Graph image
}

