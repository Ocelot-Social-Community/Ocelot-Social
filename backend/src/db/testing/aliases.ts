// The relationship aliases the test fixtures speak.
//
// `user.relateTo(badge, 'selected', { slot: 0 })` names a relationship by the key the neode
// model gave it, not by its type. 281 call sites across the factories, the seed and 74 spec
// files use 25 such aliases, so the vocabulary has to survive the move away from neode —
// rewriting them all would be a change to every test in the repository, which is not what
// replacing an ORM should cost.
//
// Keyed by (source label, alias), NOT by alias alone: the same word means different things
// depending on where it starts. `post` is TAGGED from a Tag, CATEGORIZED from a Category and
// COMMENTS from a Comment. neode scoped these to the model for the same reason.
//
// Transcribed from src/db/models/*.ts, which is the last thing those files are needed for.

export interface RelationshipAlias {
  readonly type: string
  /**
   * Seen from the node the alias is called ON. `relateTo(target, alias)` therefore writes
   * `(source)-[:TYPE]->(target)` for 'out' and `(source)<-[:TYPE]-(target)` for 'in'.
   */
  readonly direction: 'out' | 'in'
}

const aliases = new Map<string, RelationshipAlias>([
  // --- User ---------------------------------------------------------------
  ['User.avatar', { type: 'AVATAR_IMAGE', direction: 'out' }],
  ['User.roles', { type: 'HAS_ROLE', direction: 'out' }],
  ['User.primaryEmail', { type: 'PRIMARY_EMAIL', direction: 'out' }],
  ['User.following', { type: 'FOLLOWS', direction: 'out' }],
  ['User.followedBy', { type: 'FOLLOWS', direction: 'in' }],
  ['User.friends', { type: 'FRIENDS', direction: 'out' }],
  // REWARDED and VERIFIES run FROM the badge, so on a User they are incoming — which is why
  // the seed says `peterLustig.relateTo(trophy, 'rewarded')` and the edge still points the
  // other way.
  ['User.rewarded', { type: 'REWARDED', direction: 'in' }],
  ['User.verifies', { type: 'VERIFIES', direction: 'in' }],
  ['User.selected', { type: 'SELECTED', direction: 'out' }],
  ['User.invitedBy', { type: 'INVITED', direction: 'in' }],
  ['User.emoted', { type: 'EMOTED', direction: 'out' }],
  ['User.blocked', { type: 'BLOCKED', direction: 'out' }],
  ['User.muted', { type: 'MUTED', direction: 'out' }],
  ['User.notifications', { type: 'NOTIFIED', direction: 'in' }],
  ['User.inviteCodes', { type: 'GENERATED', direction: 'out' }],
  ['User.redeemedInviteCode', { type: 'REDEEMED', direction: 'out' }],
  ['User.shouted', { type: 'SHOUTED', direction: 'out' }],
  ['User.isIn', { type: 'IS_IN', direction: 'out' }],
  ['User.pinned', { type: 'PINNED', direction: 'out' }],
  ['User.observes', { type: 'OBSERVES', direction: 'out' }],

  // --- Post ---------------------------------------------------------------
  ['Post.image', { type: 'HERO_IMAGE', direction: 'out' }],
  ['Post.author', { type: 'WROTE', direction: 'in' }],
  ['Post.notified', { type: 'NOTIFIED', direction: 'out' }],
  ['Post.comments', { type: 'COMMENTS', direction: 'in' }],
  ['Post.observes', { type: 'OBSERVES', direction: 'in' }],

  // --- Comment ------------------------------------------------------------
  ['Comment.post', { type: 'COMMENTS', direction: 'out' }],
  ['Comment.author', { type: 'WROTE', direction: 'in' }],
  ['Comment.notified', { type: 'NOTIFIED', direction: 'out' }],

  // --- Tag / Category -----------------------------------------------------
  ['Tag.post', { type: 'TAGGED', direction: 'in' }],
  ['Category.post', { type: 'CATEGORIZED', direction: 'in' }],

  // --- Group --------------------------------------------------------------
  ['Group.avatar', { type: 'AVATAR_IMAGE', direction: 'out' }],
  ['Group.isIn', { type: 'IS_IN', direction: 'out' }],

  // --- InviteCode ---------------------------------------------------------
  ['InviteCode.generated', { type: 'GENERATED', direction: 'in' }],
  ['InviteCode.redeemed', { type: 'REDEEMED', direction: 'in' }],
  ['InviteCode.invitesTo', { type: 'INVITES_TO', direction: 'out' }],

  // --- Report -------------------------------------------------------------
  // BELONGS_TO from a Report points at whatever was reported (User, Post or Comment); the
  // model left `target` open for exactly that reason.
  ['Report.belongsTo', { type: 'BELONGS_TO', direction: 'out' }],
  ['Report.filed', { type: 'FILED', direction: 'in' }],
  ['Report.reviewed', { type: 'REVIEWED', direction: 'in' }],

  // --- Mail ---------------------------------------------------------------
  ['EmailAddress.belongsTo', { type: 'BELONGS_TO', direction: 'out' }],
  ['UnverifiedEmailAddress.belongsTo', { type: 'BELONGS_TO', direction: 'out' }],

  // --- SocialMedia --------------------------------------------------------
  ['SocialMedia.ownedBy', { type: 'OWNED_BY', direction: 'out' }],
])

/**
 * Resolves an alias, or throws.
 *
 * Throwing rather than defaulting: a typo used to be caught by neode, which knew its models.
 * Silently writing no edge would leave a fixture half-built and the failure would surface as
 * an unrelated assertion three files away.
 */
export const resolveAlias = (label: string, alias: string): RelationshipAlias => {
  const resolved = aliases.get(`${label}.${alias}`)
  if (!resolved) {
    throw new Error(
      `No relationship alias "${alias}" on ${label}. ` +
        `Known: ${[...aliases.keys()].filter((key) => key.startsWith(`${label}.`)).join(', ') || 'none'}`,
    )
  }
  return resolved
}

/** Every declared alias, for the drift check against the schema registry. */
export const allAliases = (): { label: string; alias: string; relationship: RelationshipAlias }[] =>
  [...aliases.entries()].map(([key, relationship]) => {
    const [label, alias] = key.split('.')
    return { label, alias, relationship }
  })
