/* eslint-disable @typescript-eslint/restrict-plus-operands */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

export function normalizeWhitespace(str) {
  // delete the first character if it is !, @ or #
  return str
    .replace(/^([!@#])/, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function escapeSpecialCharacters(str) {
  return str.replace(/(["[\]&|\\{}+!()^~*?:/-])/g, '\\$1')
}

const matchWholeText = (str, boost = 8) => {
  return `"${String(str)}"^${String(boost)}`
}

const matchEachWordExactly = (str, boost = 4) => {
  if (!str.includes(' ')) return ''
  const tmp = str
    .split(' ')
    .map((s, i) => (i === 0 ? `"${String(s)}"` : `AND "${String(s)}"`))
    .join(' ')
  return `(${tmp})^${String(boost)}`
}

const matchSomeWordsExactly = (str, boost = 2) => {
  if (!str.includes(' ')) return ''
  return str
    .split(' ')
    .map((s) => `"${String(s)}"^${String(boost)}`)
    .join(' ')
}

const matchBeginningOfWords = (str) => {
  return str
    .split(' ')
    .filter((s) => s.length >= 2)
    .map((s) => s + '*')
    .join(' ')
}

export function queryString(str) {
  const normalizedString = normalizeWhitespace(str)
  const escapedString = escapeSpecialCharacters(normalizedString)
  return `
${matchWholeText(escapedString)}
${matchEachWordExactly(escapedString)}
${matchSomeWordsExactly(escapedString)}
${matchBeginningOfWords(escapedString)}
`
}
