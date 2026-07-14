import { render } from '@testing-library/vue'
import ProfileSlug from './_slug.vue'

const localVue = global.localVue

localVue.filter('date', (d) => d)

// Mock Math.random, used in Dropdown
Object.assign(Math, {
  random: () => 0,
})

const stubs = {
  'client-only': true,
  'v-popover': true,
  'nuxt-link': true,
  'follow-list': true,
  'group-member-list': { template: '<div class="group-member-list"></div>' },
  'router-link': true,
}

describe('ProfileSlug', () => {
  let wrapper
  let mocks

  beforeEach(() => {
    mocks = {
      post: {
        id: 'p23',
        name: 'It is a post',
      },
      $t: jest.fn((t) => t),
      // If you're mocking router, then don't use VueRouter with localVue: https://vue-test-utils.vuejs.org/guides/using-with-vue-router.html
      $route: {
        params: {
          id: '4711',
          slug: 'john-doe',
        },
      },
      $router: {
        history: {
          push: jest.fn(),
        },
      },
      $toast: {
        success: jest.fn(),
        error: jest.fn(),
      },
      $apollo: {
        loading: false,
        mutate: jest.fn().mockResolvedValue(),
        subscribe: jest.fn().mockReturnValue({
          subscribe: jest.fn().mockReturnValue({ unsubscribe: jest.fn() }),
        }),
      },
    }
  })

  const Wrapper = (badgesEnabled, data, groupsEnabled = true) => {
    return render(ProfileSlug, {
      localVue,
      stubs,
      data: () => data,
      mocks: {
        ...mocks,
        $policy: {
          // Badges + groups per test args; both default the profile to its full layout.
          get: (key) => {
            if (key === 'badgesEnabled') return badgesEnabled
            if (key === 'groupsEnabled') return groupsEnabled
            return false
          },
        },
      },
    })
  }

  describe('given an authenticated user', () => {
    beforeEach(() => {
      mocks.$filters = {
        removeLinks: (c) => c,
        truncate: (a) => a,
      }
      // Ordinary member viewer: deny-by-default, granting only the baseline
      // permissions a normal member holds (children gate via $can now). Elevated /
      // moderation gates — and any newly added permission — stay denied.
      mocks.$can = (permission) =>
        [
          'post.create',
          'group.create_public',
          'group.create_closed',
          'group.create_hidden',
          'user.invite',
        ].includes(permission)
      mocks.$store = {
        getters: {
          'auth/isModerator': () => false,
          'auth/user': {
            id: 'u23',
          },
          'auth/isAdmin': () => false,
          'pinnedPosts/currentlyPinnedPosts': () => 0,
          'pinnedPosts/loaded': () => true,
        },
        dispatch: jest.fn().mockResolvedValue(),
      }
    })

    describe('given another profile user', () => {
      const user = {
        User: [
          {
            id: 'u3',
            name: 'Bob the builder',
            contributionsCount: 6,
            shoutedCount: 7,
            commentedCount: 8,
            followedByCount: 0,
            followingCount: 0,
            location: {
              name: 'Berlin',
              distanceToMe: '877 km',
            },
            badgeVerification: {
              id: 'bv1',
              icon: '/path/to/icon-bv1',
              description: 'verified',
              isDefault: false,
            },
            badgeTrophiesSelected: [
              {
                id: 'bt1',
                icon: '/path/to/icon-bt1',
                description: 'a trophy',
                isDefault: false,
              },
              {
                id: 'bt2',
                icon: '/path/to/icon-bt2',
                description: 'no trophy',
                isDefault: true,
              },
            ],
          },
        ],
      }

      describe('and badges are enabled', () => {
        beforeEach(() => {
          wrapper = Wrapper(true, user)
        })

        it('renders', () => {
          expect(wrapper.container).toMatchSnapshot()
        })
      })

      describe('and badges are disabled', () => {
        beforeEach(() => {
          wrapper = Wrapper(false, user)
        })

        it('renders', () => {
          expect(wrapper.container).toMatchSnapshot()
        })
      })
    })

    describe('given the logged in user as profile user', () => {
      beforeEach(() => {
        mocks.$route.params.id = 'u23'
      })

      const user = {
        User: [
          {
            id: 'u23',
            name: 'Bob the builder',
            contributionsCount: 6,
            shoutedCount: 7,
            commentedCount: 8,
            followedByCount: 0,
            followingCount: 0,
            location: {
              name: 'Paris',
              distanceToMe: '0 km',
            },
            badgeVerification: {
              id: 'bv1',
              icon: '/path/to/icon-bv1',
              description: 'verified',
              isDefault: false,
            },
            badgeTrophiesSelected: [
              {
                id: 'bt1',
                icon: '/path/to/icon-bt1',
                description: 'a trophy',
                isDefault: false,
              },
              {
                id: 'bt2',
                icon: '/path/to/icon-bt2',
                description: 'no trophy',
                isDefault: true,
              },
            ],
          },
        ],
      }

      describe('and badges are enabled', () => {
        beforeEach(() => {
          wrapper = Wrapper(true, user)
        })

        it('renders', () => {
          expect(wrapper.container).toMatchSnapshot()
        })
      })

      describe('and badges are disabled', () => {
        beforeEach(() => {
          wrapper = Wrapper(false, user)
        })

        it('renders', () => {
          expect(wrapper.container).toMatchSnapshot()
        })
      })

      // The add-post button is the only $can-gated element on this page. Snapshots
      // above cover the granted member; assert both branches of the deny-by-default
      // gate explicitly so an RBAC regression (e.g. a denied action staying a live
      // link) fails loudly rather than silently changing a snapshot.
      describe('add-post button gating (post.create)', () => {
        const addButton = () => wrapper.container.querySelector('.profile-post-add-button')

        it('renders a working link when post.create is granted', () => {
          mocks.$can = () => true
          wrapper = Wrapper(true, user)
          const button = addButton()
          expect(button.tagName.toLowerCase()).toBe('nuxt-link-stub')
          expect(button.classList.contains('permission-denied')).toBe(false)
        })

        it('renders a denied, non-link button when post.create is denied', () => {
          mocks.$can = () => false
          wrapper = Wrapper(true, user)
          const button = addButton()
          expect(button.tagName.toLowerCase()).toBe('button')
          expect(button.classList.contains('permission-denied')).toBe(true)
        })
      })

      // The profile groups list is gated on the groupsEnabled policy. Assert both branches
      // so removing the $policy.get('groupsEnabled') condition from the v-if fails loudly
      // instead of silently leaking the list while the groups feature is off.
      describe('group member list gating (groupsEnabled)', () => {
        const groupList = () => wrapper.container.querySelector('.group-member-list')

        it('renders the group member list while groupsEnabled is on', () => {
          wrapper = Wrapper(true, user, true)
          expect(groupList()).not.toBeNull()
        })

        it('hides the group member list while groupsEnabled is off', () => {
          wrapper = Wrapper(true, user, false)
          expect(groupList()).toBeNull()
        })
      })
    })
  })
})
