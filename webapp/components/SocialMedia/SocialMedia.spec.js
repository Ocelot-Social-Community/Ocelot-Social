import { mount } from '@vue/test-utils'
import SocialMedia from './SocialMedia.vue'

const stubs = {
  'ds-text': true,
}

describe('SocialMedia.vue', () => {
  let propsData
  let mocks

  beforeEach(() => {
    propsData = {}

    mocks = {
      $t: jest.fn(),
    }
  })

  describe('mount', () => {
    const Wrapper = () => {
      return mount(SocialMedia, { propsData, mocks, stubs })
    }

    describe('socialMedia card title', () => {
      beforeEach(() => {
        propsData.userName = 'Jenny Rostock'
        propsData.user = {
          socialMedia: [
            {
              id: 'ee1e8ed6-fbef-4bcf-b411-a12926f2ea1e',
              url: 'https://www.instagram.com/nimitbhargava',
              __typename: 'SocialMedia',
            },
          ],
        }
      })

      it('renders socialMedia card title', () => {
        Wrapper()
        expect(mocks.$t).toHaveBeenCalledWith('profile.socialMedia')
      })
    })

    describe('socialMedia links', () => {
      let wrapper

      beforeEach(() => {
        propsData.userName = 'Jenny Rostock'
        propsData.user = {
          socialMedia: [
            {
              id: 'ee1e8ed6-fbef-4bcf-b411-a12926f2ea1e',
              url: 'https://www.instagram.com/nimitbhargava',
              __typename: 'SocialMedia',
            },
            {
              id: 'dc91aecb-3289-47d0-8770-4b24eb24fd9c',
              url: 'https://www.facebook.com/NimitBhargava',
              __typename: 'SocialMedia',
            },
            {
              id: 'db1dc400-9303-4b43-9451-87dcac13b913',
              url: 'https://www.youtube.com/channel/UCu3GiKBFn5I07V9hBxF2CRA',
              __typename: 'SocialMedia',
            },
          ],
        }
        // Now assign wrapper
        wrapper = Wrapper()
      })

      it('shows 3 social media links', () => {
        expect(wrapper.findAll('a')).toHaveLength(3)
      })

      it('renders a social media link', () => {
        const link = wrapper.findAll('a').at(0)
        expect(link.attributes('href')).toEqual('https://www.instagram.com/nimitbhargava')
      })

      it('shows the first favicon', () => {
        const favicon = wrapper.findAll('a').at(0).find('img')
        expect(favicon.attributes('src')).toEqual('https://www.instagram.com/favicon.ico')
      })

      it('shows the second favicon', () => {
        const favicon = wrapper.findAll('a').at(1).find('img')
        expect(favicon.attributes('src')).toEqual('https://www.facebook.com/favicon.ico')
      })

      it('shows the last favicon', () => {
        const favicon = wrapper.findAll('a').at(-1).find('img')
        expect(favicon.attributes('src')).toEqual('https://www.youtube.com/favicon.ico')
      })
    })

    describe('social media links with trailing slash', () => {
      let wrapper

      beforeEach(() => {
        propsData.userName = 'Jenny Rostock'
        propsData.user = {
          socialMedia: [
            {
              id: 'ee1e8ed6-fbef-4bcf-b411-a12926f2ea1e',
              url: 'https://www.instagram.com/nimitbhargava/',
              __typename: 'SocialMedia',
            },
          ],
        }
        wrapper = Wrapper()
      })

      it('strips trailing slash and shows the username', () => {
        const link = wrapper.findAll('a').at(0)
        expect(link.text()).toContain('nimitbhargava')
      })
    })

    describe('social media link that is just a domain with www', () => {
      let wrapper

      beforeEach(() => {
        propsData.userName = 'Jenny Rostock'
        propsData.user = {
          socialMedia: [
            {
              id: 'ee1e8ed6-fbef-4bcf-b411-a12926f2ea1e',
              url: 'https://www.example.com/',
              __typename: 'SocialMedia',
            },
          ],
        }
        wrapper = Wrapper()
      })

      it('strips leading www. from the displayed label', () => {
        const link = wrapper.findAll('a').at(0)
        expect(link.text()).toContain('example.com')
        expect(link.text()).not.toContain('www.')
      })
    })

    describe('social media link with a username that starts with www.', () => {
      let wrapper

      beforeEach(() => {
        propsData.userName = 'Jenny Rostock'
        propsData.user = {
          socialMedia: [
            {
              id: 'ee1e8ed6-fbef-4bcf-b411-a12926f2ea1e',
              url: 'https://www.instagram.com/www.example',
              __typename: 'SocialMedia',
            },
          ],
        }
        wrapper = Wrapper()
      })

      it('keeps the leading www. in the username path segment', () => {
        const link = wrapper.findAll('a').at(0)
        expect(link.text()).toContain('www.example')
      })
    })

    describe('when a favicon fails to load', () => {
      let wrapper

      beforeEach(async () => {
        propsData.userName = 'Jenny Rostock'
        propsData.user = {
          socialMedia: [
            {
              id: 'ee1e8ed6-fbef-4bcf-b411-a12926f2ea1e',
              url: 'https://broken.example.com/user',
              __typename: 'SocialMedia',
            },
          ],
        }
        wrapper = Wrapper()
        await wrapper.find('img').trigger('error')
      })

      it('replaces the broken favicon with a fallback icon', () => {
        expect(wrapper.find('img').exists()).toBe(false)
        expect(wrapper.find('.favicon-fallback').exists()).toBe(true)
      })
    })
  })
})
