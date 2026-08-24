import { shallowMount } from '@vue/test-utils'
import SocialMediaListItem from './SocialMediaListItem.vue'

describe('SocialMediaListItem.vue', () => {
  let wrapper
  let propsData
  const socialMediaUrl = 'https://freeradical.zone/@mattwr18'
  const faviconUrl = 'https://freeradical.zone/favicon.ico'

  beforeEach(() => {
    propsData = {}
  })

  describe('shallowMount', () => {
    const Wrapper = () => {
      return shallowMount(SocialMediaListItem, { propsData })
    }

    describe('given existing social media links', () => {
      beforeEach(() => {
        propsData = { item: { id: 's1', url: socialMediaUrl, favicon: faviconUrl } }
        wrapper = Wrapper()
      })

      describe('for each link item it', () => {
        it('passes the favicon src to the Favicon child', () => {
          expect(wrapper.findComponent({ name: 'Favicon' }).props('src')).toBe(faviconUrl)
        })

        it('displays the url', () => {
          expect(wrapper.find(`a[href="${socialMediaUrl}"]`).exists()).toBe(true)
        })
      })
    })

    describe('given a mail address, which has no favicon to load', () => {
      beforeEach(() => {
        propsData = {
          item: {
            id: 's2',
            url: 'mailto:someone@example.org',
            favicon: null,
            fallbackIcon: 'envelope',
          },
        }
        wrapper = Wrapper()
      })

      it('passes the fallback icon on, instead of leaving the child at its default', () => {
        // Left out, the child falls back to `link`: this list showed a chain link beside a
        // mailto while the profile card showed an envelope — one value, described two ways.
        expect(wrapper.findComponent({ name: 'Favicon' }).props('fallbackIcon')).toBe('envelope')
      })
    })
  })
})
