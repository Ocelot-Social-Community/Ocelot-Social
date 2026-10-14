/**
 * What a rights screen says about a right — the network roles page, a group's own rights and the
 * group role templates.
 *
 * The catalogs ship an English description with every key; the locales carry the translations,
 * one namespace per catalog because the two share keys that mean different things
 * (`group.content.read` is a group right, `group.content.read.any_closed` a network one). The key
 * is flattened for the lookup: vuex-i18n reads dots as nesting, and `group.content.read` would
 * then have to be a leaf and a branch at once. backend/src/graphql/webappTranslations.spec.ts
 * keeps both namespaces in step with the catalogs.
 */
export const NETWORK_PERMISSIONS = 'admin.roles.perm'
export const GROUP_PERMISSIONS = 'group.rights.perm'

/**
 * The translated description of a catalog right, falling back to the catalog's own English text
 * (a right added before its translation, which that spec then fails on).
 */
export function permissionLabel($t, namespace, permission) {
  const path = `${namespace}.${permission.key.replace(/\./g, '_')}`
  const label = $t(path)
  return label && label !== path ? label : permission.description
}
