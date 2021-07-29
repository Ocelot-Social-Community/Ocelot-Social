export function isInternalPage(pageParams) {
  return noStringDefined(pageParams.externalLink)
}

export function noStringDefined(string) {
  return !string || string === 0
}
