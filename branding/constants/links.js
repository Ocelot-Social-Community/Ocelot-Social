// this file is duplicated in `backend/src/config/links.js` and `webapp/constants/links.js` and replaced on rebranding
export default {
  ORGANIZATION: 'https://ocelot.social',
  SUPPORT: 'https://ocelot.social',

  // on null or empty strings internal imprint is used, see 'webapp/locales/html/'
  //   you can find and store templates at 'master/branding/templates/'
  DONATE: 'https://ocelot-social.herokuapp.com/donations', // we use 'ocelot-social.herokuapp.com' at the moment, because redirections of 'ocelot.social' subpages are not working correctly
  IMPRINT: 'https://ocelot-social.herokuapp.com/imprint', // we use 'ocelot-social.herokuapp.com' at the moment, because redirections of 'ocelot.social' subpages are not working correctly
  TERMS_AND_CONDITIONS: null,
  CODE_OF_CONDUCT: null,
  DATA_PRIVACY: null,
  FAQ: 'https://ocelot.social',
}
