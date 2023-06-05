// NOTE: We cannot use `fs` here to clean up the code. Cypress breaks on any npm
// module that is not browser-compatible. Node's `fs` module is server-side only
export default {
  Image: require('./Image.js'),
  Badge:require('./Badge.js'),
  User:require('./User.js'),
  Group:require('./Group.js'),
  EmailAddress: typeof require('./EmailAddress.js'),
  UnverifiedEmailAddress: typeof require('./UnverifiedEmailAddress.js'),
  SocialMedia: typeof require('./SocialMedia.js'),
  Post: require('./Post.js'),
  Comment: require('./Comment.js'),
  Category: require('./Category.js'),
  Tag: require('./Tag.js'),
  Location: require('./Location.js'),
  Donations: require('./Donations.js'),
  Report: require('./Report.js'),
  Migration: require('./Migration.js'),
  InviteCode: require('./InviteCode.js'),
}
