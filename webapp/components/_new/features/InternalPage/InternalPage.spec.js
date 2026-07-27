import { mount } from '@vue/test-utils'
import InternalPage from './InternalPage.vue'
import { fetchBrandingHtml } from '~/components/utils/brandingHtml.js'

jest.mock('~/components/utils/brandingHtml.js', () => ({
  fetchBrandingHtml: jest.fn().mockResolvedValue(null),
}))

const localVue = global.localVue

const basePageParams = () => ({
  name: 'imprint',
  externalLink: null, // → isInternalPage, so created() does not redirect
  internalPage: {
    headlineIdent: null,
    hasContainer: false,
    hasBaseCard: false,
    htmlIdent: 'site.imprint',
    htmlSrc: { en: '/branding/x/html/en/imprint.html' },
    pageRoute: '/imprint',
  },
})

describe('InternalPage.vue', () => {
  let mocks, $fetch

  beforeEach(() => {
    jest.clearAllMocks()
    $fetch = jest.fn()
    mocks = {
      $t: (key) => key,
      $fetch,
      $store: { state: { i18n: { locale: 'en' } } },
    }
  })

  const Wrapper = (pageParams = basePageParams()) =>
    mount(InternalPage, { mocks, localVue, propsData: { pageParams } })

  it('clears brandingHtml before loading so stale HTML is not shown during a refetch', async () => {
    fetchBrandingHtml.mockResolvedValueOnce('<p>new</p>')
    const wrapper = Wrapper()
    wrapper.vm.brandingHtml = '<p>old</p>'

    const done = InternalPage.fetch.call(wrapper.vm)
    expect(wrapper.vm.brandingHtml).toBeNull() // cleared synchronously, before the await resolves
    await done
    expect(wrapper.vm.brandingHtml).toBe('<p>new</p>')
    expect(fetchBrandingHtml).toHaveBeenLastCalledWith('/branding/x/html/en/imprint.html')
  })

  it('refetches when the resolved htmlSrc changes (e.g. navigating between internal pages)', async () => {
    const wrapper = Wrapper()
    expect($fetch).not.toHaveBeenCalled()

    const next = basePageParams()
    next.internalPage.htmlSrc = { en: '/branding/x/html/en/privacy.html' }
    await wrapper.setProps({ pageParams: next })

    expect($fetch).toHaveBeenCalledTimes(1)
  })

  it('does not refetch when htmlSrc is unchanged', async () => {
    const wrapper = Wrapper()
    // same resolved src, only an unrelated flag differs → htmlSrc value stays identical
    const same = basePageParams()
    same.internalPage.hasBaseCard = true
    await wrapper.setProps({ pageParams: same })

    expect($fetch).not.toHaveBeenCalled()
  })
})
