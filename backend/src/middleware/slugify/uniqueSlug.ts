import slugify from 'slugify'

type IsUnique = (slug: string) => Promise<boolean>
export default async function uniqueSlug(str: string, isUnique: IsUnique) {
  const slug = slugify(str || 'anonymous', {
    lower: true,
    // multicharmap: { Ä: 'AE', ä: 'ae', Ö: 'OE', ö: 'oe', Ü: 'UE', ü: 'ue', ß: 'ss' },
  })
  if (await isUnique(slug)) return slug

  let count = 0
  let uniqueSlug: string
  do {
    count += 1
    uniqueSlug = `${slug}-${count}`
  } while (!(await isUnique(uniqueSlug)))
  return uniqueSlug
}
