import { mount } from '@vue/test-utils'
import SocialMedia from './SocialMedia.vue'

const stubs = {
  'ds-space': true,
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
  })
})
