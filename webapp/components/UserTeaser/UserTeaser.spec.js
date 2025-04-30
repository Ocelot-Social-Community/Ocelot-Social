import { render, screen, fireEvent } from '@testing-library/vue'
import { RouterLinkStub } from '@vue/test-utils'
import UserTeaser from './UserTeaser.vue'
import Vuex from 'vuex'

const localVue = global.localVue

/*
to test:
  - user is deleted
  - user is disabled
  - user is anonymous
  - user is a moderator
  - user is a moderator and the user is deleted
  - user is a moderator and the user is disabled
  - linkToProfile on/off
  - showAvatar on/off
  - showPopover on/off
  - hovering name on desktop
  - clicking name on mobile
  - hovering avatar on desktop
  - clicking avatar on mobile
  - hovering slug on desktop
  - clicking slug on mobile
*/

// Mock Math.random, used in Dropdown
Object.assign(Math, {
  random: () => 0,
})

const userTilda = {
  name: 'Tilda Swinton',
  slug: 'tilda-swinton',
  id: 'user1',
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
    user = userTilda,
  }) => {
    const mockIsTouchDevice = onTouchScreen
    jest.mock('../utils/isTouchDevice', () => ({
      isTouchDevice: jest.fn(() => mockIsTouchDevice),
    }))
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
      },
      stubs: {
        NuxtLink: RouterLinkStub,
        'user-teaser-popover': true,
        'v-popover': true,
        'client-only': true,
      },
      mocks: {
        $t: jest.fn((t) => t),
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
          await new Promise((resolve) => setTimeout(resolve, 2000))
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
          await new Promise((resolve) => setTimeout(resolve, 2000))
        })

        it('renders the popover', () => {
          expect(wrapper.container).toMatchSnapshot()
        })
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
