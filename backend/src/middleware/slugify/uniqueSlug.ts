/* eslint-disable @typescript-eslint/no-shadow */
/* eslint-disable @typescript-eslint/restrict-template-expressions */
import slugify from 'slugify'

// `slugify.extend`, not a named `extend` import — the reverse of what this file did under
// CommonJS. slugify's TYPES declare `extend` as a named export, but the package itself is CJS
// with a single `module.exports = slugify`, and Node's ESM loader derives named exports from a
// CJS module by static analysis. It cannot see `extend`, so `import { extend }` type-checks and
// then throws at load: "does not provide an export named 'extend'". The default import is the
// whole module.exports and always has it.
// eslint-disable-next-line import-x/no-named-as-default-member -- see above: no named export exists at runtime
slugify.extend({ Ä: 'AE', ä: 'ae', Ö: 'OE', ö: 'oe', Ü: 'UE', ü: 'ue', ß: 'ss' })

// The single slug builder: the User/Group/Post models validate slugs against
// /^[a-z0-9_-]+$/, so everything outside that alphabet must go. slugify alone
// is not enough — passing a custom `remove` disables its default catch-all
// (commas etc. would survive), hence the explicit post-filter. Falls back to
// 'anonymous' when nothing slug-able remains (e.g. '!!!').
export function toSlug(str: string): string {
  return (
    slugify(str || 'anonymous', {
      lower: true,
      remove: /[*+~.()'"!:@]/g,
    }).replace(/[^a-z0-9_-]/g, '') || 'anonymous'
  )
}

type IsUnique = (slug: string) => Promise<boolean>
export default async function uniqueSlug(str: string, isUnique: IsUnique) {
  const slug = toSlug(str)
  if (await isUnique(slug)) {
    return slug
  }

  let count = 0
  let uniqueSlug: string
  do {
    count += 1
    uniqueSlug = `${slug}-${count}`
  } while (!(await isUnique(uniqueSlug)))
  return uniqueSlug
}
