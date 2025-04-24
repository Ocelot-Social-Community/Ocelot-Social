import { render } from '@testing-library/vue'
import ProfileSlug from './_slug.vue'

const localVue = global.localVue

localVue.filter('date', (d) => d)

const stubs = {
  'client-only': true,
  'v-popover': true,
  'nuxt-link': true,
  'infinite-loading': true,
  'follow-list': true,
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
      $t: jest.fn(),
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
      },
    }
  })

  const Wrapper = (data) => {
    return render(ProfileSlug, {
      mocks,
      localVue,
      stubs,
      data: () => data,
    })
  }

  describe('given an authenticated user', () => {
    beforeEach(() => {
      mocks.$filters = {
        removeLinks: (c) => c,
        truncate: (a) => a,
      }
      mocks.$store = {
        getters: {
          'auth/isModerator': () => false,
          'auth/user': {
            id: 'u23',
          },
        },
      }
    })

    describe('given another profile user', () => {
      beforeEach(() => {
        wrapper = Wrapper({
          User: [
            {
              id: 'u3',
              name: 'Bob the builder',
              contributionsCount: 6,
              shoutedCount: 7,
              commentedCount: 8,
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
        })
      })

      it('renders', () => {
        expect(wrapper.container).toMatchSnapshot()
      })
    })

    describe('given the logged in user as profile user', () => {
      beforeEach(() => {
        mocks.$route.params.id = 'u23'
        wrapper = Wrapper({
          User: [
            {
              id: 'u23',
              name: 'Bob the builder',
              contributionsCount: 6,
              shoutedCount: 7,
              commentedCount: 8,
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
        })
      })

      it('renders', () => {
        expect(wrapper.container).toMatchSnapshot()
      })
    })
  })
})
