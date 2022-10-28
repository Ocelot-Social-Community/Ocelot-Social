export class PageParams {
  constructor(pageParams) {
    this.name = pageParams.name
    this.externalLink = pageParams.externalLink
    this.internalPage = pageParams.internalPage
  }

  overwrite(assignPageParams) {
    const pageParams = this
    if (assignPageParams.name !== undefined) {
      pageParams.name = assignPageParams.name
    }
    if (assignPageParams.externalLink !== undefined) {
      pageParams.externalLink = assignPageParams.externalLink
    }
    if (assignPageParams.internalPage !== undefined) {
      pageParams.internalPage = { ...pageParams.internalPage, ...assignPageParams.internalPage }
    }
    return pageParams
  }

  noStringDefined(string) {
    return !string || string.length === 0
  }

  get isInternalPage() {
    return !(this.externalLink && !this.noStringDefined(this.externalLink.url))
  }

  get link() {
    return this.isInternalPage ? this.internalPage.pageRoute : this.externalLink.url
  }

  redirectToPage(thisComponent) {
    if (this.isInternalPage) {
      thisComponent.$router.push(this.internalPage.pageRoute)
    } else if (typeof window !== 'undefined') {
      if (this.externalLink.target === '_blank') {
        window.open(this.externalLink.url, this.externalLink.target)
      } else {
        window.location.href = this.externalLink.url
      }
    }
  }
}
