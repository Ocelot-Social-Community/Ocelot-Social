import { render } from '@testing-library/vue'
import { RouterLinkStub } from '@vue/test-utils'
import UserTeaserPopover from './UserTeaserPopover.vue'

const localVue = global.localVue

const user = {
  id: 'id',
  name: 'Tilda Swinton',
  slug: 'tilda-swinton',
  badgeVerification: {
    id: 'bv1',
    icon: '/icons/verified',
    description: 'Verified',
    isDefault: false,
  },
  badgeTrophiesSelected: [
    {
      id: 'trophy1',
      icon: '/icons/trophy1',
      description: 'Trophy 1',
      isDefault: false,
    },
    {
      id: 'trophy2',
      icon: '/icons/trophy2',
      description: 'Trophy 2',
      isDefault: false,
    },
    {
      id: 'empty',
      icon: '/icons/empty',
      description: 'Empty',
      isDefault: true,
    },
  ],
}

const userLink = {
  name: 'profile-id-slug',
  params: { slug: 'slug', id: 'id' },
}

describe('UserTeaserPopover', () => {
  const Wrapper = ({ badgesEnabled = true, withUserLink = true, onTouchScreen = false }) => {
    const mockIsTouchDevice = onTouchScreen
    jest.mock('../utils/isTouchDevice', () => ({
      isTouchDevice: jest.fn(() => mockIsTouchDevice),
    }))
    return render(UserTeaserPopover, {
      localVue,
      propsData: {
        userId: 'id',
        userLink: withUserLink ? userLink : null,
      },
      data: () => ({
        User: [user],
      }),
      stubs: {
        NuxtLink: RouterLinkStub,
      },
      mocks: {
        $t: jest.fn((t) => t),
        $env: {
          BADGES_ENABLED: badgesEnabled,
        },
      },
    })
  }

  describe('given a touch device', () => {
    it('shows button when userLink is provided', () => {
      const wrapper = Wrapper({ withUserLink: true, onTouchScreen: true })
      expect(wrapper.container).toMatchSnapshot()
    })

    it('does not show button when userLink is not provided', () => {
      const wrapper = Wrapper({ withUserLink: false, onTouchScreen: true })
      expect(wrapper.container).toMatchSnapshot()
    })
  })

  describe('given a non-touch device', () => {
    it('does not show button when userLink is provided', () => {
      const wrapper = Wrapper({ withUserLink: true, onTouchScreen: false })
      expect(wrapper.container).toMatchSnapshot()
    })
  })

  it('shows badges when enabled', () => {
    const wrapper = Wrapper({ badgesEnabled: true })
    expect(wrapper.container).toMatchSnapshot()
  })

  it('does not show badges when disabled', () => {
    const wrapper = Wrapper({ badgesEnabled: false })
    expect(wrapper.container).toMatchSnapshot()
  })
})
