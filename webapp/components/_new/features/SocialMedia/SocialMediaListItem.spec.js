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
  })
})
