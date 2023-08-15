import slugify from 'slug'

export default async function uniqueSlug(string, isUnique) {
  const slug = slugify(string || 'anonymous', {
    lower: true,
    multicharmap: { Ä: 'AE', ä: 'ae', Ö: 'OE', ö: 'oe', Ü: 'UE', ü: 'ue', ß: 'ss' },
  })
  if (await isUnique(slug)) return slug

  let count = 0
  let uniqueSlug
  do {
    count += 1
    uniqueSlug = `${slug}-${count}`
  } while (!(await isUnique(uniqueSlug)))
  return uniqueSlug
}
