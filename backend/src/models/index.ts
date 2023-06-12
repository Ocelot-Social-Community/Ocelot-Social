// NOTE: We cannot use `fs` here to clean up the code. Cypress breaks on any npm
// module that is not browser-compatible. Node's `fs` module is server-side only
declare var Cypress: any | undefined
export default {
  Image: typeof Cypress !== 'undefined' ? require('./Image.js') : require('./Image.js').default,
  Badge: typeof Cypress !== 'undefined' ? require('./Badge.js') : require('./Badge.js').default,
  User: typeof Cypress !== 'undefined' ? require('./User.js') : require('./User.js').default,
  Group: typeof Cypress !== 'undefined' ? require('./Group.js') : require('./Group.js').default,
  EmailAddress:
    typeof Cypress !== 'undefined'
      ? require('./EmailAddress.js')
      : require('./EmailAddress.js').default,
  UnverifiedEmailAddress:
    typeof Cypress !== 'undefined'
      ? require('./UnverifiedEmailAddress.js')
      : require('./UnverifiedEmailAddress.js').default,
  SocialMedia:
    typeof Cypress !== 'undefined'
      ? require('./SocialMedia.js')
      : require('./SocialMedia.js').default,
  Post: typeof Cypress !== 'undefined' ? require('./Post.js') : require('./Post.js').default,
  Comment:
    typeof Cypress !== 'undefined' ? require('./Comment.js') : require('./Comment.js').default,
  Category:
    typeof Cypress !== 'undefined' ? require('./Category.js') : require('./Category.js').default,
  Tag: typeof Cypress !== 'undefined' ? require('./Tag.js') : require('./Tag.js').default,
  Location:
    typeof Cypress !== 'undefined' ? require('./Location.js') : require('./Location.js').default,
  Donations:
    typeof Cypress !== 'undefined' ? require('./Donations.js') : require('./Donations.js').default,
  Report: typeof Cypress !== 'undefined' ? require('./Report.js') : require('./Report.js').default,
  Migration:
    typeof Cypress !== 'undefined' ? require('./Migration.js') : require('./Migration.js').default,
  InviteCode:
    typeof Cypress !== 'undefined'
      ? require('./InviteCode.js')
      : require('./InviteCode.js').default,
}
