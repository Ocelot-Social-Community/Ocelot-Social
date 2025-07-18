import { render, screen, fireEvent } from '@testing-library/vue'
import { RouterLinkStub } from '@vue/test-utils'
import UserTeaser from './UserTeaser.vue'
import Vuex from 'vuex'

const localVue = global.localVue

// Mock Math.random, used in Dropdown
Object.assign(Math, {
  random: () => 0,
})

const waitForPopover = async () => await new Promise((resolve) => setTimeout(resolve, 1000))

let mockIsTouchDevice
jest.mock('../utils/isTouchDevice', () => ({
  isTouchDevice: jest.fn(() => mockIsTouchDevice),
}))

const userTilda = {
  name: 'Tilda Swinton',
  slug: 'tilda-swinton',
  id: 'user1',
  avatar: '/avatars/tilda-swinton',
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

describe('UserTeaser', () => {
  const Wrapper = ({
    isModerator = false,
    withLinkToProfile = true,
    onTouchScreen = false,
    withAvatar = true,
    showSlug = true,
    user = userTilda,
    withPopoverEnabled = true,
  }) => {
    mockIsTouchDevice = onTouchScreen

    const store = new Vuex.Store({
      getters: {
        'auth/user': () => {
          return {}
        },
        'auth/isModerator': () => isModerator,
      },
    })
    return render(UserTeaser, {
      localVue,
      store,
      propsData: {
        user,
        linkToProfile: withLinkToProfile,
        showAvatar: withAvatar,
        showSlug: showSlug,
        showPopover: withPopoverEnabled,
      },
      stubs: {
        NuxtLink: RouterLinkStub,
        'user-teaser-popover': true,
        'v-popover': true,
        'client-only': true,
      },
      mocks: {
        $t: jest.fn((t) => t),
        $i18n: {
          locale: jest.fn(() => 'en'),
        },
        $apollo: {
          query: jest.fn(() => Promise.resolve({ data: { user } })),
        },
      },
    })
  }

  it('renders anonymous user', () => {
    const wrapper = Wrapper({ user: null })
    expect(wrapper.container).toMatchSnapshot()
  })

  describe('given an user', () => {
    describe('without linkToProfile, on touch screen', () => {
      let wrapper
      beforeEach(() => {
        wrapper = Wrapper({ withLinkToProfile: false, onTouchScreen: true })
      })

      it('renders', () => {
        expect(wrapper.container).toMatchSnapshot()
      })

      describe('when clicking the user name', () => {
        beforeEach(async () => {
          const userName = screen.getByText('Tilda Swinton')
          await fireEvent.click(userName)
          await waitForPopover()
        })

        it('renders the popover', () => {
          expect(wrapper.container).toMatchSnapshot()
        })
      })

      describe('when clicking the user avatar', () => {
        beforeEach(async () => {
          const userAvatar = screen.getByAltText('Tilda Swinton')
          await fireEvent.click(userAvatar)
          await waitForPopover()
        })

        it('renders the popover', () => {
          expect(wrapper.container).toMatchSnapshot()
        })
      })
    })

    describe('with linkToProfile, on touch screen', () => {
      let wrapper
      beforeEach(() => {
        wrapper = Wrapper({ withLinkToProfile: true, onTouchScreen: true })
      })

      it('renders', () => {
        expect(wrapper.container).toMatchSnapshot()
      })

      describe('when clicking the user name', () => {
        beforeEach(async () => {
          const userName = screen.getByText('Tilda Swinton')
          await fireEvent.click(userName)
        })

        it('renders the popover', () => {
          expect(wrapper.container).toMatchSnapshot()
        })
      })
    })

    describe('without linkToProfile, on desktop', () => {
      let wrapper
      beforeEach(() => {
        wrapper = Wrapper({ withLinkToProfile: false, onTouchScreen: false })
      })

      it('renders', () => {
        expect(wrapper.container).toMatchSnapshot()
      })

      describe('when hovering the user name', () => {
        beforeEach(async () => {
          const userName = screen.getByText('Tilda Swinton')
          await fireEvent.mouseOver(userName)
          await waitForPopover()
        })

        it('renders the popover', () => {
          expect(wrapper.container).toMatchSnapshot()
        })
      })

      describe('when hovering the user avatar', () => {
        beforeEach(async () => {
          const userAvatar = screen.getByAltText('Tilda Swinton')
          await fireEvent.mouseOver(userAvatar)
          await waitForPopover()
        })

        it('renders the popover', () => {
          expect(wrapper.container).toMatchSnapshot()
        })
      })
    })

    describe('with linkToProfile, on desktop', () => {
      let wrapper
      beforeEach(() => {
        wrapper = Wrapper({ withLinkToProfile: true, onTouchScreen: false })
      })

      it('renders', () => {
        expect(wrapper.container).toMatchSnapshot()
      })

      describe('when hovering the user name', () => {
        beforeEach(async () => {
          const userName = screen.getByText('Tilda Swinton')
          await fireEvent.mouseOver(userName)
          await waitForPopover()
        })

        it('renders the popover', () => {
          expect(wrapper.container).toMatchSnapshot()
        })
      })
    })

    describe('avatar is disabled', () => {
      it('does not render the avatar', () => {
        const wrapper = Wrapper({ withAvatar: false })
        expect(wrapper.container).toMatchSnapshot()
      })
    })

    describe('user is deleted', () => {
      it('renders anonymous user', () => {
        const wrapper = Wrapper({ user: { ...userTilda, deleted: true } })
        expect(wrapper.container).toMatchSnapshot()
      })

      describe('even if the current user is a moderator', () => {
        it('renders anonymous user', () => {
          const wrapper = Wrapper({
            user: { ...userTilda, deleted: true },
            isModerator: true,
          })
          expect(wrapper.container).toMatchSnapshot()
        })
      })
    })

    describe('user is disabled', () => {
      it('renders anonymous user', () => {
        const wrapper = Wrapper({ user: { ...userTilda, disabled: true } })
        expect(wrapper.container).toMatchSnapshot()
      })

      describe('current user is a moderator', () => {
        it('renders user name', () => {
          const wrapper = Wrapper({ user: { ...userTilda, disabled: true }, isModerator: true })
          expect(wrapper.container).toMatchSnapshot()
        })
      })
    })
  })
})
