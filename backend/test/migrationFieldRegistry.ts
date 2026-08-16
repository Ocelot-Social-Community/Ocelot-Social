/**
 * Every field that is — or WAS — resolved by a neo4j-graphql-js directive.
 *
 * This list is deliberately FROZEN rather than derived from the .gql files at runtime.
 * Deriving it would make the field-resolution tests delete themselves: replacing a
 * `@cypher` directive with a real field resolver removes the directive, so a derived work
 * list would drop that field — and the very change the tests exist to guard would go
 * untested. Entries therefore stay here after their directive is gone; the field is still
 * in the schema and must still resolve.
 *
 * Maintenance rules:
 *  - ADD an entry when a .gql file gains a @cypher/@relation field.
 *    `directiveInventory.spec` fails until you do.
 *  - REMOVE an entry only when the FIELD itself is removed from the schema — never merely
 *    because its directive was replaced. That is the whole point.
 */
export const MIGRATION_FIELD_REGISTRY: Record<string, string[]> = {
  ApiKey: ['owner'],
  Badge: ['rewarded', 'verifies'],
  Category: ['postCount', 'posts'],
  Comment: [
    'author',
    'isPostObservedByMe',
    'post',
    'postObservingUsersCount',
    'shoutedByCurrentUser',
    'shoutedCount',
  ],
  Group: ['avatar', 'categories', 'isMutedByMe', 'location', 'membersCount', 'posts'],
  InviteCode: ['generatedBy', 'redeemedBy', 'redeemedByCount'],
  Location: ['name', 'parent'],
  Message: ['author', 'avatar', 'date', 'files', 'room', 'seen', 'senderId', 'username'],
  Post: [
    'author',
    'categories',
    'comments',
    'commentsCount',
    'emotionsCount',
    'eventLocation',
    'group',
    'image',
    'isObservedByMe',
    'observingUsersCount',
    'pinnedAt',
    'pinnedBy',
    'postType',
    'relatedContributions',
    'shoutedBy',
    'shoutedByCurrentUser',
    'shoutedCount',
    'tags',
    'viewedTeaserByCurrentUser',
  ],
  Room: ['avatar', 'group', 'isGroupRoom', 'lastMessage', 'roomId', 'roomName', 'users'],
  SocialMedia: ['ownedBy'],
  Tag: ['taggedCount', 'taggedCountUnique', 'taggedPosts'],
  User: [
    'avatar',
    'badgeTrophies',
    'badgeTrophiesCount',
    'blocked',
    'categories',
    'comments',
    'contributions',
    'email',
    'followedBy',
    'followedByCount',
    'followedByCurrentUser',
    'following',
    'followingCount',
    'friends',
    'friendsCount',
    'invited',
    'invitedBy',
    'isBlocked',
    'isMuted',
    'location',
    'redeemedInviteCode',
    'shouted',
    'socialMedia',
  ],
}
