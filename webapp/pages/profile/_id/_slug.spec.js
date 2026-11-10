import { render, fireEvent, waitFor } from '@testing-library/vue'
import { mount } from '@vue/test-utils'
import ProfileSlug from './_slug.vue'
import LocationPickerMap from '~/components/Map/LocationPickerMap'
import AvatarUploader from '~/components/Uploader/AvatarUploader'

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

      // Blocking ends following both ways and the backend refuses it again while the block
      // stands — so no follow button across a block, whoever blocked whom.
      describe('the follow button', () => {
        const followButton = (profileUser) =>
          Wrapper(true, { User: [{ ...user.User[0], ...profileUser }] }).container.querySelector(
            '[data-test="follow-btn"]',
          )

        it('is offered without a block', () => {
          expect(followButton({ isBlocked: false, blocked: false })).not.toBeNull()
        })

        it('is not offered when I blocked them', () => {
          expect(followButton({ isBlocked: true, blocked: true })).toBeNull()
        })

        it('is not offered when they blocked me', () => {
          expect(followButton({ isBlocked: false, blocked: true })).toBeNull()
        })
      })

      it('states the comments deleting the account deletes, not the posts commented on', () => {
        // #8557: commentedCount (8) is a number of posts; the dialog needs the comments.
        const profileUser = { ...user.User[0], createdAt: '2020-01-01', commentsCount: 23 }
        wrapper = render(ProfileSlug, {
          localVue,
          stubs: { ...stubs, DateTime: true },
          data: () => ({ ...user, deleteUserData: profileUser, showDeleteModal: true }),
          mocks: { ...mocks, $policy: { get: () => true } },
        })
        const cell = wrapper.getByText('common.comment').parentElement
        expect(cell.textContent.replace(/\s+/g, ' ').trim()).toBe('common.comment 23')
      })

      describe('the dialog for deleting the account', () => {
        const dialog = (mutate) => {
          const profileUser = { ...user.User[0], createdAt: '2020-01-01', commentsCount: 23 }
          const replace = jest.fn()
          const toastBackendError = jest.fn()
          const rendered = render(ProfileSlug, {
            localVue,
            stubs: { ...stubs, DateTime: true },
            data: () => ({ ...user, deleteUserData: profileUser, showDeleteModal: true }),
            mocks: {
              ...mocks,
              $router: { replace },
              $toastBackendError: toastBackendError,
              $apollo: { ...mocks.$apollo, mutate },
              $policy: { get: () => true },
            },
          })
          const button = (name) =>
            rendered.container.querySelector(`[data-testid="os-confirm-dialog-${name}"]`)
          const isOpen = () => rendered.container.querySelector('[role="dialog"]') !== null
          return { ...rendered, replace, toastBackendError, button, isOpen }
        }

        it('deletes the user with posts and comments, then leaves the profile', async () => {
          const mutate = jest.fn().mockResolvedValue()
          const { button, isOpen, replace } = dialog(mutate)
          await fireEvent.click(button('confirm'))
          await waitFor(() => expect(replace).toHaveBeenCalledWith('/'))
          expect(mutate).toHaveBeenCalledWith(
            expect.objectContaining({ variables: { id: 'u3', resource: ['Post', 'Comment'] } }),
          )
          expect(mocks.$toast.success).toHaveBeenCalledWith('settings.deleteUserAccount.success')
          expect(isOpen()).toBe(false)
        })

        it('keeps the dialog open and the confirm button busy while the mutation runs', async () => {
          let resolveMutation
          const mutate = jest.fn(() => new Promise((resolve) => (resolveMutation = resolve)))
          const { button, isOpen, replace } = dialog(mutate)
          await fireEvent.click(button('confirm'))
          expect(button('confirm').disabled).toBe(true)
          expect(isOpen()).toBe(true)
          resolveMutation()
          await waitFor(() => expect(replace).toHaveBeenCalledWith('/'))
          expect(isOpen()).toBe(false)
        })

        it('reports a failed mutation and stays open for another try', async () => {
          const error = new Error('boom')
          const mutate = jest.fn().mockRejectedValue(error)
          const { button, isOpen, replace, toastBackendError } = dialog(mutate)
          await fireEvent.click(button('confirm'))
          await waitFor(() => expect(toastBackendError).toHaveBeenCalledWith(error))
          expect(mutate).toHaveBeenCalled()
          await waitFor(() => expect(button('confirm').disabled).toBe(false))
          expect(isOpen()).toBe(true)
          expect(replace).not.toHaveBeenCalled()
        })

        it('closes on cancel without deleting anything', async () => {
          const mutate = jest.fn().mockResolvedValue()
          const { button, isOpen } = dialog(mutate)
          await fireEvent.click(button('cancel'))
          await waitFor(() => expect(isOpen()).toBe(false))
          expect(mutate).not.toHaveBeenCalled()
        })
      })

      it("uses the green pin on someone else's profile", () => {
        // mount() (unlike testing-library's render() used elsewhere in this
        // file) actually descends into client-only's default slot content —
        // stub infinite-loading too, or its mounted hook throws in jsdom.
        const mountWrapper = mount(ProfileSlug, {
          localVue,
          stubs: { ...stubs, 'infinite-loading': true },
          data: () => user,
          mocks: { ...mocks, $policy: { get: () => true } },
        })
        expect(mountWrapper.findComponent(LocationPickerMap).props('markerColorToken')).toBe(
          '--color-map-marker-user',
        )
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
      describe('uploading a new avatar', () => {
        it('puts it into the logged-in user of the store, which the avatar menu shows', () => {
          mocks.$store.commit = jest.fn()
          const mountWrapper = mount(ProfileSlug, {
            localVue,
            stubs: { ...stubs, 'infinite-loading': true },
            data: () => user,
            mocks: { ...mocks, $policy: { get: () => true } },
          })
          const avatar = { url: '/uploads/new.jpg' }
          mountWrapper.findComponent(AvatarUploader).vm.$emit('uploaded', {
            UpdateUser: { id: 'u23', avatar },
          })
          expect(mocks.$store.commit).toHaveBeenCalledWith('auth/SET_USER_PARTIAL', { avatar })
        })
      })

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

      describe('location map (mirrors the group profile page)', () => {
        beforeEach(() => {
          wrapper = Wrapper(true, user)
        })

        it('shows a read-only map with the user location', () => {
          expect(wrapper.container.querySelector('.profile-location-map')).not.toBeNull()
          expect(wrapper.container.querySelector('.location-picker-map')).not.toBeNull()
        })

        it('uses the orange "current user" pin on my own profile', () => {
          // See the matching comment in the "someone else's profile" test above.
          const mountWrapper = mount(ProfileSlug, {
            localVue,
            stubs: { ...stubs, 'infinite-loading': true },
            data: () => user,
            mocks: { ...mocks, $policy: { get: () => true } },
          })
          expect(mountWrapper.findComponent(LocationPickerMap).props('markerColorToken')).toBe(
            '--color-map-marker-current-user',
          )
        })

        it('hides the map when the user has no location', () => {
          const userWithoutLocation = { User: [{ ...user.User[0], location: null }] }
          wrapper = Wrapper(true, userWithoutLocation)
          expect(wrapper.container.querySelector('.profile-location-map')).toBeNull()
        })

        describe('clicking the location name/distance', () => {
          let scrollIntoViewSpy

          beforeEach(() => {
            scrollIntoViewSpy = jest.fn()
            Element.prototype.scrollIntoView = scrollIntoViewSpy
          })

          afterEach(() => {
            delete Element.prototype.scrollIntoView
          })

          it('scrolls to the location map', async () => {
            const button = wrapper.container.querySelector('.location-info-button')
            await fireEvent.click(button)

            expect(scrollIntoViewSpy).toHaveBeenCalledWith({
              behavior: 'smooth',
              block: 'center',
            })
          })
        })
      })

      // The profile groups list is gated on the groupsEnabled policy. Assert both branches
      // so removing the $policy.get('groupsEnabled') condition from the v-if fails loudly
      // instead of silently leaking the list while the groups feature is off.
      // #6442: see the group page — the post list must not ask "is anything loading".
      describe('the post list', () => {
        // The post grid only: other parts of the page have spinners and empty states of their own.
        const postGrid = () => wrapper.container.querySelector('.ds-grid')
        const spinner = () => postGrid().querySelector('.os-spinner')
        const empty = () => postGrid().querySelector('.hc-empty')

        it('shows a spinner until the posts have loaded', () => {
          wrapper = Wrapper(true, { ...user, posts: null })
          expect(spinner()).not.toBeNull()
          expect(empty()).toBeNull()
        })

        it('shows "no posts" for an empty result, while another query is still loading', () => {
          mocks.$apollo.loading = true
          wrapper = Wrapper(true, { ...user, posts: [] })
          expect(empty()).not.toBeNull()
          expect(spinner()).toBeNull()
        })
      })

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
