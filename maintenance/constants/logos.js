// this file is duplicated in `backend/src/config/logos.js` and `webapp/constants/logos.js` and replaced on rebranding
// this are the paths in the webapp
export default {
  LOGO_HEADER_PATH: '/img/custom/logo-horizontal.svg',
  LOGO_HEADER_WIDTH: '130px',
  LOGO_HEADER_CLICK: {
    // externalLink: {
    //   url: 'https://ocelot.social',
    //   target: '_blank',
    // },
    externalLink: null,
    internalPath: {
      to: {
        name: 'index',
      },
      scrollTo: '.main-navigation',
    },
  },
  LOGO_SIGNUP_PATH: '/img/custom/logo-squared.svg',
  LOGO_WELCOME_PATH: '/img/custom/logo-squared.svg',
  LOGO_LOGOUT_PATH: '/img/custom/logo-squared.svg',
  LOGO_PASSWORD_RESET_PATH: '/img/custom/logo-squared.svg',
  LOGO_MAINTENACE_RESET_PATH: '/img/custom/logo-squared.svg',
}
