import { render } from '@testing-library/vue'
import { RouterLinkStub } from '@vue/test-utils'
import UserTeaserHelper from './UserTeaserHelper.vue'

const localVue = global.localVue

const userLink = {
  name: 'profile-id-slug',
  params: { slug: 'slug', id: 'id' },
}

let mockIsTouchDevice

jest.mock('../utils/isTouchDevice', () => ({
  isTouchDevice: jest.fn(() => mockIsTouchDevice),
}))

describe('UserTeaserHelper', () => {
  const Wrapper = ({
    withLinkToProfile = true,
    onTouchScreen = false,
    withPopoverEnabled = true,
  }) => {
    mockIsTouchDevice = onTouchScreen

    return render(UserTeaserHelper, {
      localVue,
      propsData: {
        userLink,
        linkToProfile: withLinkToProfile,
        showPopover: withPopoverEnabled,
      },
      stubs: {
        NuxtLink: RouterLinkStub,
      },
    })
  }

  describe('with linkToProfile and popover enabled, on touch screen', () => {
    let wrapper
    beforeEach(() => {
      wrapper = Wrapper({ withLinkToProfile: true, onTouchScreen: true, withPopoverEnabled: true })
    })

    it('renders button', () => {
      expect(wrapper.container).toMatchSnapshot()
    })
  })

  describe('without linkToProfile', () => {
    let wrapper
    beforeEach(() => {
      wrapper = Wrapper({ withLinkToProfile: false, onTouchScreen: false })
    })

    it('renders span', () => {
      expect(wrapper.container).toMatchSnapshot()
    })
  })

  describe('with linkToProfile, on desktop', () => {
    let wrapper
    beforeEach(() => {
      wrapper = Wrapper({ withLinkToProfile: true, onTouchScreen: false })
    })

    it('renders link', () => {
      expect(wrapper.container).toMatchSnapshot()
    })
  })
})
