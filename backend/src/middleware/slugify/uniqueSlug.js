import slugify from 'slug'

let locale; 

if(locale === 'de'){
  locale = 'de'
} else {
  locale = ''
}

export default async function uniqueSlug(string, isUnique) {
  const slug = slugify(string || 'anonymous', {
    lower: true,
    charmap: slug.charmap,
    multicharmap: slug.multicharmap,
    locale: `${locale}`
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
