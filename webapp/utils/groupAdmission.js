/**
 * How somebody gets INTO a group, derived from the rights its non-member role holds.
 *
 * The twin of `privacyLevelOf`: the same two-rights-make-a-state shape, over the other pair.
 * Visibility answers "who may look", admission answers "who may enter", and they are genuinely
 * independent — a public group may ask for approval, a closed one may let anybody straight in.
 *
 *   open       `group.join`          anybody walks in, no approval
 *   onRequest  `group.join.request`  anybody may ask, somebody has to let them in
 *   closed     neither               the only way in is an invitation or an admin
 *
 * `group.join` wins over `group.join.request` where a group holds both, because it is what the
 * resolver reads first when it decides where a membership lands (JoinGroup, `joinsAsMember`).
 * Deriving it differently here would label a door the server opens as one it keeps shut.
 */
export const ADMISSION_STATES = ['open', 'onRequest', 'closed']

export const admissionOf = (nonMemberPermissions) => {
  const held = new Set(nonMemberPermissions ?? [])
  if (held.has('group.join')) return 'open'
  if (held.has('group.join.request')) return 'onRequest'
  return 'closed'
}

/** The non-member rights one admission state means — what a change to it has to write. */
export const admissionRights = (state) => {
  if (state === 'open') return ['group.join']
  if (state === 'onRequest') return ['group.join.request']
  return []
}

/**
 * The permission list of a non-member role with its admission set to `state`.
 *
 * Both join rights are replaced rather than merged: they are three states of one question, and
 * a list holding both would read as two answers to it.
 */
export const withAdmission = (nonMemberPermissions, state) => {
  const kept = (nonMemberPermissions ?? []).filter(
    (key) => key !== 'group.join' && key !== 'group.join.request',
  )
  return [...kept, ...admissionRights(state)]
}

export default admissionOf
