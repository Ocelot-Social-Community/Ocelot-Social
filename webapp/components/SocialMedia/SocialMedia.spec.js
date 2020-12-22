import { config, mount } from '@vue/test-utils'
import SocialMedia from './SocialMedia.vue'

config.stubs['ds-space'] = '<span><slot /></span>'
config.stubs['ds-text'] = '<span><slot /></span>'

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
      return mount(SocialMedia, { propsData, mocks })
    }

    // it('has class "hc-badges"', () => {
    //   expect(Wrapper().contains('.hc-badges')).toBe(true)
    // })


    // the description should be as good as possible.
    // Even someone who cannot code should be able to read the specs,
    // e.g. a project manager can read the tests to understand
    // what the component ist doing
    describe('new test', () => {
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

    // check the description
    describe('given a badge', () => {

      // a variable for the wrapper
      let wrapper
      
      beforeEach(() => {
        propsData.userName = 'Jenny Rostock'
        // this is too much
        // three social media links should be enough
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
            {
              id: '3423d494-13e9-4be3-84c1-c4b5fdaa4077',
              url: 'https://twitter.com/NimitBhargava',
              __typename: 'SocialMedia',
            },
            {
              id: 'a29421ed-0e97-455c-9932-b294ca39f0b2',
              url: 'https://www.linkedin.com/in/nimitbhargava',
              __typename: 'SocialMedia',
            },
            {
              id: 'c5079a2c-8127-4620-8a34-7e1bccfa13b7',
              url: 'https://freeradical.zone/@mattwr18',
              __typename: 'SocialMedia',
            },
            {
              id: 'cf2e00cd-e060-4216-b8ee-8b6a917ec6d0',
              url: 'https://twitter.com/mattwr18',
              __typename: 'SocialMedia',
            },
          ],
        }
        // Now assign wrapper
        wrapper = Wrapper()
      })

      it('shows 7 social media links', () => {
        // check what the wrapper looks like:
        console.log(wrapper.html())
        expect(wrapper.findAll('a')).toHaveLength(7)
      })


      it('renders a social media link', () => {
        const link = wrapper.findAll('a').at(0)
        console.log(link.html())
        expect(link.attributes('href')).toEqual('https://www.instagram.com/nimitbhargava')
      })

      it('shows the favicon', () => {
        const favicon = wrapper.findAll('a').at(0).find('img')
        console.log(favicon.html())
        expect(favicon.attributes('src')).toEqual('https://www.instagram.com/favicon.ico')
      })

      // I think this is enough to test the component

      
      // Case 0:
      // Display profile links
      //
      // Case1:
      // Have 3 links
      // Expected 3 links
      //
      // Case 2:
      // Simulate click on link - expect click on link
    })
  })
})
