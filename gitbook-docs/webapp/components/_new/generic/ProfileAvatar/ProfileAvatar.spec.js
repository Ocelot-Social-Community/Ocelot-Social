import { mount } from '@vue/test-utils'
import ProfileAvatar from './ProfileAvatar'
import BaseIcon from '~/components/_new/generic/BaseIcon/BaseIcon'

const localVue = global.localVue

describe('ProfileAvatar', () => {
  let propsData, wrapper
  beforeEach(() => {
    propsData = {}
    wrapper = Wrapper()
  })

  const Wrapper = () => {
    return mount(ProfileAvatar, { propsData, localVue })
  }

  it('renders no image', () => {
    expect(wrapper.find('img').exists()).toBe(false)
  })

  it('renders an icon', () => {
    expect(wrapper.findComponent(BaseIcon).exists()).toBe(true)
  })

  describe('given a profile', () => {
    describe('with no image', () => {
      beforeEach(() => {
        propsData = {
          profile: {
            name: 'Matt Rider',
          },
        }
        wrapper = Wrapper()
      })

      describe('no profile name', () => {
        it('renders an icon', () => {
          propsData = { profile: { name: null } }
          wrapper = Wrapper()
          expect(wrapper.findComponent(BaseIcon).exists()).toBe(true)
        })
      })

      describe("profile name is 'Anonymous'", () => {
        it('renders an icon', () => {
          propsData = { profile: { name: 'Anonymous' } }
          wrapper = Wrapper()
          expect(wrapper.findComponent(BaseIcon).exists()).toBe(true)
        })
      })

      it('displays profile initials', () => {
        expect(wrapper.find('.initials').text()).toEqual('MR')
      })

      it('displays no more than 3 initials', () => {
        propsData = { profile: { name: 'Ana Paula Nunes Marques' } }
        wrapper = Wrapper()
        expect(wrapper.find('.initials').text()).toEqual('APN')
      })
    })

    describe('with a relative avatar url', () => {
      beforeEach(() => {
        propsData = {
          profile: {
            name: 'Not Anonymous',
            avatar: {
              url: '/avatar.jpg',
            },
          },
        }
        wrapper = Wrapper()
      })

      it('adds a prefix to load the image from the uploads service', () => {
        expect(wrapper.find('.image').attributes('src')).toBe('/api/avatar.jpg')
      })
    })

    describe('with an absolute avatar url', () => {
      beforeEach(() => {
        propsData = {
          profile: {
            name: 'Not Anonymous',
            avatar: {
              url: 'https://s3.amazonaws.com/uifaces/faces/twitter/sawalazar/128.jpg',
            },
          },
        }
        wrapper = Wrapper()
      })

      it('keeps the avatar URL as is', () => {
        // e.g. our seeds have absolute image URLs
        expect(wrapper.find('.image').attributes('src')).toBe(
          'https://s3.amazonaws.com/uifaces/faces/twitter/sawalazar/128.jpg',
        )
      })
    })
  })
})
