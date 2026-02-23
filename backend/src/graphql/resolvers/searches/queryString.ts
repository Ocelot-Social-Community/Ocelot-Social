export function normalizeWhitespace(str: string) {
  // delete the first character if it is !, @ or #
  return str
    .replace(/^([!@#])/, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function escapeSpecialCharacters(str: string) {
  return str.replace(/(["[\]&|\\{}+!()^~*?:/-])/g, '\\$1')
}

const matchWholeText = (str: string, boost = 8) => {
  return `"${str}"^${String(boost)}`
}

const matchEachWordExactly = (str: string, boost = 4) => {
  if (!str.includes(' ')) return ''
  const tmp = str
    .split(' ')
    .map((s, i) => (i === 0 ? `"${s}"` : `AND "${s}"`))
    .join(' ')
  return `(${tmp})^${String(boost)}`
}

const matchSomeWordsExactly = (str: string, boost = 2) => {
  if (!str.includes(' ')) return ''
  return str
    .split(' ')
    .map((s) => `"${s}"^${String(boost)}`)
    .join(' ')
}

const matchBeginningOfWords = (str: string) => {
  return str
    .split(' ')
    .filter((s) => s.length >= 2)
    .map((s) => s + '*')
    .join(' ')
}

export function queryString(str: string) {
  const normalizedString = normalizeWhitespace(str)
  const escapedString = escapeSpecialCharacters(normalizedString)
  return `
${matchWholeText(escapedString)}
${matchEachWordExactly(escapedString)}
${matchSomeWordsExactly(escapedString)}
${matchBeginningOfWords(escapedString)}
`
}
