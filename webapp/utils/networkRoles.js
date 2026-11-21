// The network roles whose name nobody can change: `owner` (protected) and `user` (the baseline
// everybody holds). Their names are identifiers the code relies on, so they are shown translated —
// as "Inhaber", like a group's owner. Every other role reads as its name: whoever made it chose
// that name, and a default role like `admin` can be renamed, deleted or made anew under the same
// name, so a translation looked up by name could name the wrong thing.
export const FIXED_NETWORK_ROLES = ['owner', 'user']

/**
 * How a network role reads: the translation of a fixed role, otherwise `format(name)`.
 * Only the fixed roles are looked up — any other name would ask for a key no locale defines.
 */
export const networkRoleLabel = (name, translate, format = (value) => value) =>
  FIXED_NETWORK_ROLES.includes(name) ? translate(`networkRoles.${name}`) : format(name)
