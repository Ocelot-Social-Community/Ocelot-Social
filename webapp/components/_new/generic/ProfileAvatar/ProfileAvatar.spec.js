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

    describe('with an avatar', () => {
      beforeEach(() => {
        propsData = {
          profile: {
            name: 'Not Anonymous',
            avatar: {
              url: 'http://localhost:8000//avatar.jpg',
              w320: 'http://localhost:8000//avatars/avatar-w320.jpg',
              w640: 'http://localhost:8000//avatars/avatar-w640.jpg',
              w1024: 'http://localhost:8000//avatars/avatar-w1024.jpg',
            },
          },
        }
        wrapper = Wrapper()
      })

      it('puts the original url in `src` attribute', () => {
        expect(wrapper.find('.image').attributes('src')).toBe('http://localhost:8000//avatar.jpg')
      })

      it('puts various sizes of the image in `srcset` attribute', () => {
        expect(wrapper.find('.image').attributes('srcset')).toBe(
          'http://localhost:8000//avatars/avatar-w320.jpg 320w, http://localhost:8000//avatars/avatar-w640.jpg 640w, http://localhost:8000//avatars/avatar-w1024.jpg 1024w',
        )
      })

      it('but because the avatar is so small, it will always ask the browser to render w320 size', () => {
        expect(wrapper.find('.image').attributes('sizes')).toBe('320px')
      })
    })
  })
})
