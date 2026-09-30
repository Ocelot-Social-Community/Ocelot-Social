import { mount, createLocalVue } from '@vue/test-utils'
import Vuex from 'vuex'
import VTooltip from 'v-tooltip'
import ContentMenu from './ContentMenu.vue'
import { groupRights } from '~/test/groupRightsFixture'

const localVue = createLocalVue()

localVue.use(VTooltip)
localVue.use(Vuex)

let mocks

describe('ContentMenu.vue - Group', () => {
  beforeEach(() => {
    mocks = {
      $t: jest.fn((str) => str),
      $i18n: {
        locale: () => 'en',
      },
      $router: {
        push: jest.fn(),
      },
      $policy: { get: () => 0 },
    }
  })

  const stubs = {
    'router-link': {
      template: '<span><slot /></span>',
    },
  }

  const getters = {
    'auth/isModerator': () => false,
    'auth/isAdmin': () => false,
    'pinnedPosts/currentlyPinnedPosts': () => 1,
    'pinnedPosts/loaded': () => true,
  }
  const actions = {
    'pinnedPosts/fetch': jest.fn(),
  }

  const openContentMenu = async (values = {}) => {
    const store = new Vuex.Store({ getters, actions })
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
    const rights = groupRights('owner')

    describe('when maxGroupPinnedPosts = 0', () => {
      beforeEach(() => {
        mocks.$policy = { get: () => 0 }
      })

      it('can not pin unpinned post', async () => {
        const wrapper = await openContentMenu({
          isOwner: false,
          resourceType: 'contribution',
          resource: {
            id: 'd23a4265-f5f7-4e17-9f86-85f714b4b9f8',
            groupPinned: false,
            group: {
              ...rights,
            },
          },
        })
        expect(
          wrapper.findAll('.os-menu-item').filter((item) => item.text() === 'post.menu.groupPin'),
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
              ...rights,
            },
          },
        })
        wrapper
          .findAll('.os-menu-item')
          .filter((item) => item.text() === 'post.menu.groupUnpin')
          .at(0)
          .trigger('click')
        expect(wrapper.emitted('unpinGroupPost')).toEqual([
          [
            {
              id: 'd23a4265-f5f7-4e17-9f86-85f714b4b9f8',
              groupPinned: true,
              group: {
                ...rights,
              },
            },
          ],
        ])
      })
    })

    describe('when maxPinnedPosts = 1', () => {
      beforeEach(() => {
        mocks.$policy = { get: () => 1 }
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
                ...rights,
                currentlyPinnedPostsCount,
              },
            },
          })
          wrapper
            .findAll('.os-menu-item')
            .filter((item) => item.text() === 'post.menu.groupPin')
            .at(0)
            .trigger('click')
          expect(wrapper.emitted('pinGroupPost')).toEqual([
            [
              {
                id: 'd23a4265-f5f7-4e17-9f86-85f714b4b9f8',
                groupPinned: false,
                group: {
                  ...rights,
                  currentlyPinnedPostsCount,
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
                ...rights,
                currentlyPinnedPostsCount,
              },
            },
          })
          wrapper
            .findAll('.os-menu-item')
            .filter((item) => item.text() === 'post.menu.groupUnpin')
            .at(0)
            .trigger('click')
          expect(wrapper.emitted('unpinGroupPost')).toEqual([
            [
              {
                id: 'd23a4265-f5f7-4e17-9f86-85f714b4b9f8',
                groupPinned: true,
                group: {
                  ...rights,
                  currentlyPinnedPostsCount,
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
                ...rights,
                currentlyPinnedPostsCount,
              },
            },
          })
          wrapper
            .findAll('.os-menu-item')
            .filter((item) => item.text() === 'post.menu.groupPin')
            .at(0)
            .trigger('click')
          expect(wrapper.emitted('pinGroupPost')).toEqual([
            [
              {
                id: 'd23a4265-f5f7-4e17-9f86-85f714b4b9f8',
                groupPinned: false,
                group: {
                  ...rights,
                  currentlyPinnedPostsCount,
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
                ...rights,
                currentlyPinnedPostsCount,
              },
            },
          })
          wrapper
            .findAll('.os-menu-item')
            .filter((item) => item.text() === 'post.menu.groupUnpin')
            .at(0)
            .trigger('click')
          expect(wrapper.emitted('unpinGroupPost')).toEqual([
            [
              {
                id: 'd23a4265-f5f7-4e17-9f86-85f714b4b9f8',
                groupPinned: true,
                group: {
                  ...rights,
                  currentlyPinnedPostsCount,
                },
              },
            ],
          ])
        })
      })
    })

    describe('when maxPinnedPosts = 2', () => {
      beforeEach(() => {
        mocks.$policy = { get: () => 2 }
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
                ...rights,
                currentlyPinnedPostsCount,
              },
            },
          })
          wrapper
            .findAll('.os-menu-item')
            .filter((item) => item.text() === 'post.menu.groupPin')
            .at(0)
            .trigger('click')
          expect(wrapper.emitted('pinGroupPost')).toEqual([
            [
              {
                id: 'd23a4265-f5f7-4e17-9f86-85f714b4b9f8',
                groupPinned: false,
                group: {
                  ...rights,
                  currentlyPinnedPostsCount,
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
                ...rights,
                currentlyPinnedPostsCount,
              },
            },
          })
          wrapper
            .findAll('.os-menu-item')
            .filter((item) => item.text() === 'post.menu.groupUnpin')
            .at(0)
            .trigger('click')
          expect(wrapper.emitted('unpinGroupPost')).toEqual([
            [
              {
                id: 'd23a4265-f5f7-4e17-9f86-85f714b4b9f8',
                groupPinned: true,
                group: {
                  ...rights,
                  currentlyPinnedPostsCount,
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
                ...rights,
                currentlyPinnedPostsCount,
              },
            },
          })
          expect(
            wrapper.findAll('.os-menu-item').filter((item) => item.text() === 'post.menu.groupPin')
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
                ...rights,
                currentlyPinnedPostsCount,
              },
            },
          })
          wrapper
            .findAll('.os-menu-item')
            .filter((item) => item.text() === 'post.menu.groupUnpin')
            .at(0)
            .trigger('click')
          expect(wrapper.emitted('unpinGroupPost')).toEqual([
            [
              {
                id: 'd23a4265-f5f7-4e17-9f86-85f714b4b9f8',
                groupPinned: true,
                group: {
                  ...rights,
                  currentlyPinnedPostsCount,
                },
              },
            ],
          ])
        })
      })
    })
  })

  describe('as group admin', () => {
    const rights = groupRights('admin')

    describe('when maxGroupPinnedPosts = 0', () => {
      beforeEach(() => {
        mocks.$policy = { get: () => 0 }
      })

      it('can not pin unpinned post', async () => {
        const wrapper = await openContentMenu({
          isOwner: false,
          resourceType: 'contribution',
          resource: {
            id: 'd23a4265-f5f7-4e17-9f86-85f714b4b9f8',
            groupPinned: false,
            group: {
              ...rights,
            },
          },
        })
        expect(
          wrapper.findAll('.os-menu-item').filter((item) => item.text() === 'post.menu.groupPin'),
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
              ...rights,
            },
          },
        })
        wrapper
          .findAll('.os-menu-item')
          .filter((item) => item.text() === 'post.menu.groupUnpin')
          .at(0)
          .trigger('click')
        expect(wrapper.emitted('unpinGroupPost')).toEqual([
          [
            {
              id: 'd23a4265-f5f7-4e17-9f86-85f714b4b9f8',
              groupPinned: true,
              group: {
                ...rights,
              },
            },
          ],
        ])
      })
    })

    describe('when maxPinnedPosts = 1', () => {
      beforeEach(() => {
        mocks.$policy = { get: () => 1 }
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
                ...rights,
                currentlyPinnedPostsCount,
              },
            },
          })
          wrapper
            .findAll('.os-menu-item')
            .filter((item) => item.text() === 'post.menu.groupPin')
            .at(0)
            .trigger('click')
          expect(wrapper.emitted('pinGroupPost')).toEqual([
            [
              {
                id: 'd23a4265-f5f7-4e17-9f86-85f714b4b9f8',
                groupPinned: false,
                group: {
                  ...rights,
                  currentlyPinnedPostsCount,
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
                ...rights,
                currentlyPinnedPostsCount,
              },
            },
          })
          wrapper
            .findAll('.os-menu-item')
            .filter((item) => item.text() === 'post.menu.groupUnpin')
            .at(0)
            .trigger('click')
          expect(wrapper.emitted('unpinGroupPost')).toEqual([
            [
              {
                id: 'd23a4265-f5f7-4e17-9f86-85f714b4b9f8',
                groupPinned: true,
                group: {
                  ...rights,
                  currentlyPinnedPostsCount,
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
                ...rights,
                currentlyPinnedPostsCount,
              },
            },
          })
          wrapper
            .findAll('.os-menu-item')
            .filter((item) => item.text() === 'post.menu.groupPin')
            .at(0)
            .trigger('click')
          expect(wrapper.emitted('pinGroupPost')).toEqual([
            [
              {
                id: 'd23a4265-f5f7-4e17-9f86-85f714b4b9f8',
                groupPinned: false,
                group: {
                  ...rights,
                  currentlyPinnedPostsCount,
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
                ...rights,
                currentlyPinnedPostsCount,
              },
            },
          })
          wrapper
            .findAll('.os-menu-item')
            .filter((item) => item.text() === 'post.menu.groupUnpin')
            .at(0)
            .trigger('click')
          expect(wrapper.emitted('unpinGroupPost')).toEqual([
            [
              {
                id: 'd23a4265-f5f7-4e17-9f86-85f714b4b9f8',
                groupPinned: true,
                group: {
                  ...rights,
                  currentlyPinnedPostsCount,
                },
              },
            ],
          ])
        })
      })
    })

    describe('when maxPinnedPosts = 2', () => {
      beforeEach(() => {
        mocks.$policy = { get: () => 2 }
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
                ...rights,
                currentlyPinnedPostsCount,
              },
            },
          })
          wrapper
            .findAll('.os-menu-item')
            .filter((item) => item.text() === 'post.menu.groupPin')
            .at(0)
            .trigger('click')
          expect(wrapper.emitted('pinGroupPost')).toEqual([
            [
              {
                id: 'd23a4265-f5f7-4e17-9f86-85f714b4b9f8',
                groupPinned: false,
                group: {
                  ...rights,
                  currentlyPinnedPostsCount,
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
                ...rights,
                currentlyPinnedPostsCount,
              },
            },
          })
          wrapper
            .findAll('.os-menu-item')
            .filter((item) => item.text() === 'post.menu.groupUnpin')
            .at(0)
            .trigger('click')
          expect(wrapper.emitted('unpinGroupPost')).toEqual([
            [
              {
                id: 'd23a4265-f5f7-4e17-9f86-85f714b4b9f8',
                groupPinned: true,
                group: {
                  ...rights,
                  currentlyPinnedPostsCount,
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
                ...rights,
                currentlyPinnedPostsCount,
              },
            },
          })
          expect(
            wrapper.findAll('.os-menu-item').filter((item) => item.text() === 'post.menu.groupPin')
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
                ...rights,
                currentlyPinnedPostsCount,
              },
            },
          })
          wrapper
            .findAll('.os-menu-item')
            .filter((item) => item.text() === 'post.menu.groupUnpin')
            .at(0)
            .trigger('click')
          expect(wrapper.emitted('unpinGroupPost')).toEqual([
            [
              {
                id: 'd23a4265-f5f7-4e17-9f86-85f714b4b9f8',
                groupPinned: true,
                group: {
                  ...rights,
                  currentlyPinnedPostsCount,
                },
              },
            ],
          ])
        })
      })
    })
  })

  describe('as group usual', () => {
    const rights = groupRights('usual')

    describe('when maxGroupPinnedPosts = 0', () => {
      beforeEach(() => {
        mocks.$policy = { get: () => 0 }
      })

      it('can not pin unpinned post', async () => {
        const wrapper = await openContentMenu({
          isOwner: false,
          resourceType: 'contribution',
          resource: {
            id: 'd23a4265-f5f7-4e17-9f86-85f714b4b9f8',
            groupPinned: false,
            group: {
              ...rights,
            },
          },
        })
        expect(
          wrapper.findAll('.os-menu-item').filter((item) => item.text() === 'post.menu.groupPin'),
        ).toHaveLength(0)
      })

      it('can not unpin pinned post', async () => {
        const wrapper = await openContentMenu({
          isOwner: false,
          resourceType: 'contribution',
          resource: {
            id: 'd23a4265-f5f7-4e17-9f86-85f714b4b9f8',
            groupPinned: true,
            group: {
              ...rights,
            },
          },
        })
        expect(
          wrapper.findAll('.os-menu-item').filter((item) => item.text() === 'post.menu.groupUnpin'),
        ).toHaveLength(0)
      })
    })

    describe('when maxPinnedPosts = 1', () => {
      beforeEach(() => {
        mocks.$policy = { get: () => 1 }
      })

      it('can not pin unpinned post', async () => {
        const wrapper = await openContentMenu({
          isOwner: false,
          resourceType: 'contribution',
          resource: {
            id: 'd23a4265-f5f7-4e17-9f86-85f714b4b9f8',
            groupPinned: false,
            group: {
              ...rights,
              currentlyPinnedPostsCount: 0,
            },
          },
        })
        expect(
          wrapper.findAll('.os-menu-item').filter((item) => item.text() === 'post.menu.groupPin'),
        ).toHaveLength(0)
      })

      it('can not unpin pinned post', async () => {
        const wrapper = await openContentMenu({
          isOwner: false,
          resourceType: 'contribution',
          resource: {
            id: 'd23a4265-f5f7-4e17-9f86-85f714b4b9f8',
            groupPinned: true,
            group: {
              ...rights,
              currentlyPinnedPostsCount: 1,
            },
          },
        })
        expect(
          wrapper.findAll('.os-menu-item').filter((item) => item.text() === 'post.menu.groupUnpin'),
        ).toHaveLength(0)
      })
    })
  })
})
