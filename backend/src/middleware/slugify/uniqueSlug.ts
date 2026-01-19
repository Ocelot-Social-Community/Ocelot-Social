import slugify from 'slugify'

slugify.extend({ Ä: 'AE', ä: 'ae', Ö: 'OE', ö: 'oe', Ü: 'UE', ü: 'ue', ß: 'ss' })

type IsUnique = (slug: string) => Promise<boolean>
export default async function uniqueSlug(str: string, isUnique: IsUnique) {
  const slug = slugify(str || 'anonymous', {
    lower: true,
    remove: /[*+~.()'"!:@]/g,
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
