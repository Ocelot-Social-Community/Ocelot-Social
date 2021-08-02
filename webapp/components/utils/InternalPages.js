export function isInternalPage(pageParams) {
  return noStringDefined(pageParams.externalLink)
}

export function noStringDefined(string) {
  return !string || string === 0
}

export function pageLink(pageParams) {
  return isInternalPage(pageParams) ? pageParams.internalLink : pageParams.externalLink
}
