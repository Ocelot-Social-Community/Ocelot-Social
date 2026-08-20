/* eslint-disable @typescript-eslint/no-shadow */
/* eslint-disable @typescript-eslint/restrict-template-expressions */
import slugify from 'slugify'

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
