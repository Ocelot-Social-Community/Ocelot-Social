import { mount, createLocalVue } from '@vue/test-utils'
import Vuex from 'vuex'
import VTooltip from 'v-tooltip'
import Styleguide from '@@/'
import ContentMenu from './ContentMenu.vue'

const localVue = createLocalVue()

localVue.use(Styleguide)
localVue.use(VTooltip)
localVue.use(Vuex)

describe('ContentMenu.vue - Group', () => {
  const mocks = {
    $t: jest.fn((str) => str),
    $i18n: {
      locale: () => 'en',
    },
    $router: {
      push: jest.fn(),
    },
  }

  const stubs = {
    'router-link': {
      template: '<span><slot /></span>',
    },
  }

  const mutations = {
    'modal/SET_OPEN': jest.fn(),
  }
  const getters = {
    'auth/isModerator': () => false,
    'auth/isAdmin': () => false,
    'pinnedPosts/maxPinnedPosts': 1,
    'pinnedPosts/currentlyPinnedPosts': 1,
  }
  const actions = {
    'pinnedPosts/fetch': jest.fn(),
  }

  const openContentMenu = async (values = {}) => {
    const store = new Vuex.Store({ mutations, getters, actions })
    const wrapper = mount(ContentMenu, {
      propsData: {
        ...values,
      },
      mocks,
      store,
      localVue,
      stubs,
    })
    const menuToggle = wrapper.find('[data-test="content-menu-button"]')
    await menuToggle.trigger('click')
    return wrapper
  }

  describe('as group owner', () => {
    const myRole = 'owner'

    describe('when maxGroupPinnedPosts = 0', () => {
      beforeEach(() => {
        mocks.$env = {
          MAX_PINNED_GROUP_POSTS: 0,
        }
      })

      it('can not pin unpinned post', async () => {
        const wrapper = await openContentMenu({
          isOwner: false,
          resourceType: 'contribution',
          resource: {
            id: 'd23a4265-f5f7-4e17-9f86-85f714b4b9f8',
            groupPinned: false,
            group: {
              myRole,
            },
          },
        })
        expect(
          wrapper.findAll('.ds-menu-item').filter((item) => item.text() === 'post.menu.groupPin'),
        ).toHaveLength(0)
      })

      it('can unpin pinned post', async () => {
        const wrapper = await openContentMenu({
          isOwner: false,
          resourceType: 'contribution',
          resource: {
            id: 'd23a4265-f5f7-4e17-9f86-85f714b4b9f8',
            groupPinned: true,
            group: {
              myRole,
            },
          },
        })
        wrapper
          .findAll('.ds-menu-item')
          .filter((item) => item.text() === 'post.menu.groupUnpin')
          .at(0)
          .trigger('click')
        expect(wrapper.emitted('unpinGroupPost')).toEqual([
          [
            {
              id: 'd23a4265-f5f7-4e17-9f86-85f714b4b9f8',
              groupPinned: true,
              group: {
                myRole,
              },
            },
          ],
        ])
      })
    })

    describe('when maxPinnedPosts = 1', () => {
      beforeEach(() => {
        mocks.$env = {
          MAX_PINNED_GROUP_POSTS: 1,
        }
      })

      describe('when currentlyPinnedPostsCount = 0', () => {
        const currentlyPinnedPostsCount = 0

        it('pin unpinned post', async () => {
          const wrapper = await openContentMenu({
            isOwner: false,
            resourceType: 'contribution',
            resource: {
              id: 'd23a4265-f5f7-4e17-9f86-85f714b4b9f8',
              groupPinned: false,
              group: {
                myRole,
                currentlyPinnedPostsCount,
              },
            },
          })
          wrapper
            .findAll('.ds-menu-item')
            .filter((item) => item.text() === 'post.menu.groupPin')
            .at(0)
            .trigger('click')
          expect(wrapper.emitted('pinGroupPost')).toEqual([
            [
              {
                isOwner: false,
                resourceType: 'contribution',
                resource: {
                  id: 'd23a4265-f5f7-4e17-9f86-85f714b4b9f8',
                  groupPinned: false,
                  group: {
                    myRole,
                    currentlyPinnedPostsCount,
                  },
                },
              },
            ],
          ])
        })

        it('unpin pinned post', async () => {
          const wrapper = await openContentMenu({
            isOwner: false,
            resourceType: 'contribution',
            resource: {
              id: 'd23a4265-f5f7-4e17-9f86-85f714b4b9f8',
              groupPinned: true,
              group: {
                myRole,
                currentlyPinnedPostsCount,
              },
            },
          })
          wrapper
            .findAll('.ds-menu-item')
            .filter((item) => item.text() === 'post.menu.groupUnpin')
            .at(0)
            .trigger('click')
          expect(wrapper.emitted('unpinGroupPost')).toEqual([
            [
              {
                isOwner: false,
                resourceType: 'contribution',
                resource: {
                  id: 'd23a4265-f5f7-4e17-9f86-85f714b4b9f8',
                  groupPinned: true,
                  group: {
                    myRole,
                    currentlyPinnedPostsCount,
                  },
                },
              },
            ],
          ])
        })
      })

      describe('when currentlyPinnedPostsCount = 1', () => {
        const currentlyPinnedPostsCount = 1

        it('pin unpinned post', async () => {
          const wrapper = await openContentMenu({
            isOwner: false,
            resourceType: 'contribution',
            resource: {
              id: 'd23a4265-f5f7-4e17-9f86-85f714b4b9f8',
              groupPinned: false,
              group: {
                myRole,
                currentlyPinnedPostsCount,
              },
            },
          })
          wrapper
            .findAll('.ds-menu-item')
            .filter((item) => item.text() === 'post.menu.groupPin')
            .at(0)
            .trigger('click')
          expect(wrapper.emitted('pinGroupPost')).toEqual([
            [
              {
                isOwner: false,
                resourceType: 'contribution',
                resource: {
                  id: 'd23a4265-f5f7-4e17-9f86-85f714b4b9f8',
                  groupPinned: false,
                  group: {
                    myRole,
                    currentlyPinnedPostsCount,
                  },
                },
              },
            ],
          ])
        })

        it('unpin pinned post', async () => {
          const wrapper = await openContentMenu({
            isOwner: false,
            resourceType: 'contribution',
            resource: {
              id: 'd23a4265-f5f7-4e17-9f86-85f714b4b9f8',
              groupPinned: true,
              group: {
                myRole,
                currentlyPinnedPostsCount,
              },
            },
          })
          wrapper
            .findAll('.ds-menu-item')
            .filter((item) => item.text() === 'post.menu.groupUnpin')
            .at(0)
            .trigger('click')
          expect(wrapper.emitted('unpinGroupPost')).toEqual([
            [
              {
                isOwner: false,
                resourceType: 'contribution',
                resource: {
                  id: 'd23a4265-f5f7-4e17-9f86-85f714b4b9f8',
                  groupPinned: true,
                  group: {
                    myRole,
                    currentlyPinnedPostsCount,
                  },
                },
              },
            ],
          ])
        })
      })
    })

    describe('when maxPinnedPosts = 2', () => {
      beforeEach(() => {
        mocks.$env = {
          MAX_PINNED_GROUP_POSTS: 2,
        }
      })

      describe('when currentlyPinnedPostsCount = 1', () => {
        const currentlyPinnedPostsCount = 1

        it('pin unpinned post', async () => {
          const wrapper = await openContentMenu({
            isOwner: false,
            resourceType: 'contribution',
            resource: {
              id: 'd23a4265-f5f7-4e17-9f86-85f714b4b9f8',
              groupPinned: false,
              group: {
                myRole,
                currentlyPinnedPostsCount,
              },
            },
          })
          wrapper
            .findAll('.ds-menu-item')
            .filter((item) => item.text() === 'post.menu.groupPin')
            .at(0)
            .trigger('click')
          expect(wrapper.emitted('pinGroupPost')).toEqual([
            [
              {
                isOwner: false,
                resourceType: 'contribution',
                resource: {
                  id: 'd23a4265-f5f7-4e17-9f86-85f714b4b9f8',
                  groupPinned: false,
                  group: {
                    myRole,
                    currentlyPinnedPostsCount,
                  },
                },
              },
            ],
          ])
        })

        it('unpin pinned post', async () => {
          const wrapper = await openContentMenu({
            isOwner: false,
            resourceType: 'contribution',
            resource: {
              id: 'd23a4265-f5f7-4e17-9f86-85f714b4b9f8',
              groupPinned: true,
              group: {
                myRole,
                currentlyPinnedPostsCount,
              },
            },
          })
          wrapper
            .findAll('.ds-menu-item')
            .filter((item) => item.text() === 'post.menu.groupUnpin')
            .at(0)
            .trigger('click')
          expect(wrapper.emitted('unpinGroupPost')).toEqual([
            [
              {
                isOwner: false,
                resourceType: 'contribution',
                resource: {
                  id: 'd23a4265-f5f7-4e17-9f86-85f714b4b9f8',
                  groupPinned: true,
                  group: {
                    myRole,
                    currentlyPinnedPostsCount,
                  },
                },
              },
            ],
          ])
        })
      })

      describe('when currentlyPinnedPostsCount = 2', () => {
        const currentlyPinnedPostsCount = 2

        it('pin unpinned post', async () => {
          const wrapper = await openContentMenu({
            isOwner: false,
            resourceType: 'contribution',
            resource: {
              id: 'd23a4265-f5f7-4e17-9f86-85f714b4b9f8',
              groupPinned: false,
              group: {
                myRole,
                currentlyPinnedPostsCount,
              },
            },
          })
          expect(
            wrapper.findAll('.ds-menu-item').filter((item) => item.text() === 'post.menu.groupPin')
              .length,
          ).toEqual(0)
        })

        it('unpin pinned post', async () => {
          const wrapper = await openContentMenu({
            isOwner: false,
            resourceType: 'contribution',
            resource: {
              id: 'd23a4265-f5f7-4e17-9f86-85f714b4b9f8',
              groupPinned: true,
              group: {
                myRole,
                currentlyPinnedPostsCount,
              },
            },
          })
          wrapper
            .findAll('.ds-menu-item')
            .filter((item) => item.text() === 'post.menu.groupUnpin')
            .at(0)
            .trigger('click')
          expect(wrapper.emitted('unpinGroupPost')).toEqual([
            [
              {
                isOwner: false,
                resourceType: 'contribution',
                resource: {
                  id: 'd23a4265-f5f7-4e17-9f86-85f714b4b9f8',
                  groupPinned: true,
                  group: {
                    myRole,
                    currentlyPinnedPostsCount,
                  },
                },
              },
            ],
          ])
        })
      })
    })
  })

  /* describe('as group admin', () => {
    const myRole = 'admin'
  }) */

  /* describe('as group usual', () => {
    const myRole = 'usual'
  }) */
})
