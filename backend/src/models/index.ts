// NOTE: We cannot use `fs` here to clean up the code. Cypress breaks on any npm
// module that is not browser-compatible. Node's `fs` module is server-side only
declare let Cypress: any | undefined
export default {
  Image: typeof Cypress !== 'undefined' ? require('./Image') : require('./Image').default,
  Badge: typeof Cypress !== 'undefined' ? require('./Badge') : require('./Badge').default,
  User: typeof Cypress !== 'undefined' ? require('./User') : require('./User').default,
  Group: typeof Cypress !== 'undefined' ? require('./Group') : require('./Group').default,
  EmailAddress:
    typeof Cypress !== 'undefined' ? require('./EmailAddress') : require('./EmailAddress').default,
  UnverifiedEmailAddress:
    typeof Cypress !== 'undefined'
      ? require('./UnverifiedEmailAddress')
      : require('./UnverifiedEmailAddress').default,
  SocialMedia:
    typeof Cypress !== 'undefined' ? require('./SocialMedia') : require('./SocialMedia').default,
  Post: typeof Cypress !== 'undefined' ? require('./Post') : require('./Post').default,
  Comment: typeof Cypress !== 'undefined' ? require('./Comment') : require('./Comment').default,
  Category: typeof Cypress !== 'undefined' ? require('./Category') : require('./Category').default,
  Tag: typeof Cypress !== 'undefined' ? require('./Tag') : require('./Tag').default,
  Location: typeof Cypress !== 'undefined' ? require('./Location') : require('./Location').default,
  Donations:
    typeof Cypress !== 'undefined' ? require('./Donations') : require('./Donations').default,
  Report: typeof Cypress !== 'undefined' ? require('./Report') : require('./Report').default,
  Migration:
    typeof Cypress !== 'undefined' ? require('./Migration') : require('./Migration').default,
  InviteCode:
    typeof Cypress !== 'undefined' ? require('./InviteCode') : require('./InviteCode').default,
}
