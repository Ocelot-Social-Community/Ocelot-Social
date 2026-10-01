import { render } from '@testing-library/vue'
import { RouterLinkStub } from '@vue/test-utils'
import UserAvatarPopover from './UserAvatarPopover.vue'

const localVue = global.localVue

const user = {
  id: 'id',
  name: 'Tilda Swinton',
  slug: 'tilda-swinton',
  followedByCount: 42,
  contributionsCount: 7,
  commentedCount: 13,
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

describe('UserAvatarPopover', () => {
  const Wrapper = ({
    badgesEnabled = true,
    withUserLink = true,
    showProfileLink = false,
    userData = user,
  }) => {
    return render(UserAvatarPopover, {
      localVue,
      propsData: {
        userId: 'id',
        userLink: withUserLink ? userLink : null,
        showProfileLink,
      },
      data: () => ({
        User: [userData],
      }),
      stubs: {
        NuxtLink: RouterLinkStub,
      },
      mocks: {
        $t: jest.fn((t) => t),
        $policy: { get: (key) => (key === 'badgesEnabled' ? badgesEnabled : false) },
      },
    })
  }

  // The explicit "open profile" button is off by default everywhere now — the whole card is a
  // link instead (see canNavigate), on both touch and non-touch devices. showProfileLink is kept
  // only for a caller that might still want that extra, more discoverable call-to-action.
  describe('explicit "open profile" button (showProfileLink)', () => {
    it('is not shown by default, even with a userLink', () => {
      const wrapper = Wrapper({ withUserLink: true })
      expect(wrapper.queryByText('user-avatar.popover.open-profile')).toBeNull()
    })

    it('is shown when showProfileLink is explicitly enabled', () => {
      const wrapper = Wrapper({ withUserLink: true, showProfileLink: true })
      expect(wrapper.queryByText('user-avatar.popover.open-profile')).not.toBeNull()
    })

    it('stays hidden with showProfileLink enabled but no userLink', () => {
      const wrapper = Wrapper({ withUserLink: false, showProfileLink: true })
      expect(wrapper.queryByText('user-avatar.popover.open-profile')).toBeNull()
    })
  })

  describe('whole card as a link (canNavigate)', () => {
    it('renders the card itself as a link when a userLink is provided', () => {
      const wrapper = Wrapper({ withUserLink: true })
      const root = wrapper.container.querySelector('.user-avatar-popover')
      expect(root.tagName).toBe('A')
    })

    it('renders a plain div, not a link, when no userLink is provided', () => {
      const wrapper = Wrapper({ withUserLink: false })
      const root = wrapper.container.querySelector('.user-avatar-popover')
      expect(root.tagName).toBe('DIV')
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

  it('renders correctly for a fresh user with zero counts', () => {
    const freshUser = {
      ...user,
      followedByCount: 0,
      contributionsCount: 0,
      commentedCount: 0,
    }
    const wrapper = Wrapper({ userData: freshUser })
    expect(wrapper.container).toMatchSnapshot()
  })
})
