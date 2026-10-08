// `groupType`, the name the API used before a group's visibility was derived from its rights.
//
// Kept as a deprecated alias while the webapp still sends and reads it: CreateGroup takes it in
// place of `template` (the three types are the names of the three templates that derive to
// them), UpdateGroup in place of `visibility`. Removed together with the last client that uses
// it — the one place to delete, rather than a fallback spread over the shield and the resolvers.

type GroupArgs = Record<string, unknown>

/** The template CreateGroup was asked for, by its name or by the old type. */
export const templateFromArgs = (args: GroupArgs): string | undefined =>
  (args.template as string | undefined) ?? (args.groupType as string | undefined)

/** The visibility UpdateGroup was asked to apply, by its name or by the old type. */
export const visibilityFromArgs = (args: GroupArgs): string | null =>
  (args.visibility as string | null | undefined) ??
  (args.groupType as string | null | undefined) ??
  null

/**
 * Takes the alias out of the arguments a resolver writes onto the group node (`SET group +=`).
 * The resolvers drop `template` and `visibility` themselves — neither is written that way — and
 * a `groupType` left in would bring back the column the migration removed.
 */
export const withoutGroupTypeAlias = (params: GroupArgs): void => {
  delete params.groupType
}
