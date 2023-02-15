import { mount, createLocalVue } from '@vue/test-utils'
import Vuex from 'vuex'
import VTooltip from 'v-tooltip'
import Styleguide from '@human-connection/styleguide'
import ContentMenu from './ContentMenu.vue'

const localVue = createLocalVue()

localVue.use(Styleguide)
localVue.use(VTooltip)
localVue.use(Vuex)

const stubs = {
  'router-link': {
    template: '<span><slot /></span>',
  },
}

let getters, mutations, mocks, menuToggle, openModalSpy

describe('ContentMenu.vue', () => {
  beforeEach(() => {
    mocks = {
      $t: jest.fn((str) => str),
      $i18n: {
        locale: () => 'en',
      },
      $router: {
        push: jest.fn(),
      },
    }
  })

  describe('mount', () => {
    mutations = {
      'modal/SET_OPEN': jest.fn(),
    }
    getters = {
      'auth/isModerator': () => false,
      'auth/isAdmin': () => false,
    }

    const openContentMenu = async (values = {}) => {
      const store = new Vuex.Store({ mutations, getters })
      const wrapper = mount(ContentMenu, {
        propsData: {
          ...values,
        },
        mocks,
        store,
        localVue,
        stubs,
      })
      menuToggle = wrapper.find('[data-test="content-menu-button"]')
      await menuToggle.trigger('click')
      return wrapper
    }

    describe('owner of contribution', () => {
      let wrapper
      beforeEach(async () => {
        wrapper = await openContentMenu({
          isOwner: true,
          resourceType: 'contribution',
          resource: {
            id: 'd23a4265-f5f7-4e17-9f86-85f714b4b9f8',
          },
        })
        openModalSpy = jest.spyOn(wrapper.vm, 'openModal')
      })

      it('can edit the contribution', () => {
        expect(
          wrapper
            .findAll('.ds-menu-item')
            .filter((item) => item.text() === 'post.menu.edit')
            .at(0)
            .find('span.ds-menu-item-link')
            .attributes('to'),
        ).toBe('/post-edit-id')
      })

      it('can delete the contribution', () => {
        wrapper
          .findAll('.ds-menu-item')
          .filter((item) => item.text() === 'post.menu.delete')
          .at(0)
          .trigger('click')
        expect(openModalSpy).toHaveBeenCalledWith('confirm', 'delete')
      })
    })

    describe('admin can', () => {
      it('pin unpinned post', async () => {
        getters['auth/isAdmin'] = () => true
        const wrapper = await openContentMenu({
          isOwner: false,
          resourceType: 'contribution',
          resource: {
            id: 'd23a4265-f5f7-4e17-9f86-85f714b4b9f8',
            pinnedBy: null,
          },
        })
        wrapper
          .findAll('.ds-menu-item')
          .filter((item) => item.text() === 'post.menu.pin')
          .at(0)
          .trigger('click')
        expect(wrapper.emitted('pinPost')).toEqual([
          [
            {
              id: 'd23a4265-f5f7-4e17-9f86-85f714b4b9f8',
              pinnedBy: null,
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
            pinnedBy: 'someone',
          },
        })
        wrapper
          .findAll('.ds-menu-item')
          .filter((item) => item.text() === 'post.menu.unpin')
          .at(0)
          .trigger('click')
        expect(wrapper.emitted('unpinPost')).toEqual([
          [
            {
              id: 'd23a4265-f5f7-4e17-9f86-85f714b4b9f8',
              pinnedBy: 'someone',
            },
          ],
        ])
      })

      it('can delete another user', async () => {
        getters['auth/user'] = () => {
          return { id: 'some-user', slug: 'some-user' }
        }
        const wrapper = await openContentMenu({
          resourceType: 'user',
          resource: {
            id: 'another-user',
            slug: 'another-user',
          },
        })
        wrapper
          .findAll('.ds-menu-item')
          .filter((item) => item.text() === 'settings.deleteUserAccount.name')
          .at(0)
          .trigger('click')
        expect(wrapper.emitted('delete')).toEqual([
          [
            {
              id: 'another-user',
              slug: 'another-user',
            },
          ],
        ])
      })

      it('can not delete the own account', async () => {
        const wrapper = await openContentMenu({
          resourceType: 'user',
          resource: {
            id: 'some-user',
            slug: 'some-user',
          },
        })
        expect(
          wrapper
            .findAll('.ds-menu-item')
            .filter((item) => item.text() === 'settings.deleteUserAccount.name'),
        ).toEqual({})
      })
    })

    describe('owner of comment can', () => {
      let wrapper
      beforeEach(async () => {
        wrapper = await openContentMenu({
          isOwner: true,
          resourceType: 'comment',
          resource: {
            id: 'd23a4265-f5f7-4e17-9f86-85f714b4b9f8',
          },
        })
        openModalSpy = jest.spyOn(wrapper.vm, 'openModal')
      })
      it('edit the comment', () => {
        wrapper
          .findAll('.ds-menu-item')
          .filter((item) => item.text() === 'comment.menu.edit')
          .at(0)
          .trigger('click')
        expect(wrapper.emitted('editComment')).toBeTruthy()
      })
      it('delete the comment', () => {
        wrapper
          .findAll('.ds-menu-item')
          .filter((item) => item.text() === 'comment.menu.delete')
          .at(0)
          .trigger('click')
        expect(openModalSpy).toHaveBeenCalledWith('confirm', 'delete')
      })
    })

    describe('reporting', () => {
      it('a post of another user is possible', async () => {
        getters['auth/isAdmin'] = () => false
        getters['auth/isModerator'] = () => false
        const wrapper = await openContentMenu({
          isOwner: false,
          resourceType: 'contribution',
          resource: {
            id: 'd23a4265-f5f7-4e17-9f86-85f714b4b9f8',
          },
        })
        openModalSpy = jest.spyOn(wrapper.vm, 'openModal')
        wrapper
          .findAll('.ds-menu-item')
          .filter((item) => item.text() === 'report.contribution.title')
          .at(0)
          .trigger('click')
        expect(openModalSpy).toHaveBeenCalledWith('report')
      })

      it('a comment of another user is possible', async () => {
        const wrapper = await openContentMenu({
          isOwner: false,
          resourceType: 'comment',
          resource: {
            id: 'd23a4265-f5f7-4e17-9f86-85f714b4b9f8',
          },
        })
        openModalSpy = jest.spyOn(wrapper.vm, 'openModal')
        wrapper
          .findAll('.ds-menu-item')
          .filter((item) => item.text() === 'report.comment.title')
          .at(0)
          .trigger('click')
        expect(openModalSpy).toHaveBeenCalledWith('report')
      })

      it('another user is possible', async () => {
        const wrapper = await openContentMenu({
          isOwner: false,
          resourceType: 'user',
          resource: {
            id: 'd23a4265-f5f7-4e17-9f86-85f714b4b9f8',
          },
        })
        openModalSpy = jest.spyOn(wrapper.vm, 'openModal')
        wrapper
          .findAll('.ds-menu-item')
          .filter((item) => item.text() === 'report.user.title')
          .at(0)
          .trigger('click')
        expect(openModalSpy).toHaveBeenCalledWith('report')
      })

      it('another organization is possible', async () => {
        const wrapper = await openContentMenu({
          isOwner: false,
          resourceType: 'organization',
          resource: {
            id: 'd23a4265-f5f7-4e17-9f86-85f714b4b9f8',
          },
        })
        openModalSpy = jest.spyOn(wrapper.vm, 'openModal')
        wrapper
          .findAll('.ds-menu-item')
          .filter((item) => item.text() === 'report.organization.title')
          .at(0)
          .trigger('click')
        expect(openModalSpy).toHaveBeenCalledWith('report')
      })
    })

    describe('moderator', () => {
      it('can disable posts', async () => {
        getters['auth/isAdmin'] = () => false
        getters['auth/isModerator'] = () => true
        const wrapper = await openContentMenu({
          isOwner: false,
          resourceType: 'contribution',
          resource: {
            id: 'd23a4265-f5f7-4e17-9f86-85f714b4b9f8',
            disabled: false,
          },
        })
        openModalSpy = jest.spyOn(wrapper.vm, 'openModal')
        wrapper
          .findAll('.ds-menu-item')
          .filter((item) => item.text() === 'disable.contribution.title')
          .at(0)
          .trigger('click')
        expect(openModalSpy).toHaveBeenCalledWith('disable')
      })

      it('can disable comments', async () => {
        const wrapper = await openContentMenu({
          isOwner: false,
          resourceType: 'comment',
          resource: {
            id: 'd23a4265-f5f7-4e17-9f86-85f714b4b9f8',
            disabled: false,
          },
        })
        openModalSpy = jest.spyOn(wrapper.vm, 'openModal')
        wrapper
          .findAll('.ds-menu-item')
          .filter((item) => item.text() === 'disable.comment.title')
          .at(0)
          .trigger('click')
        expect(openModalSpy).toHaveBeenCalledWith('disable')
      })

      it('can disable users', async () => {
        const wrapper = await openContentMenu({
          isOwner: false,
          resourceType: 'user',
          resource: {
            id: 'd23a4265-f5f7-4e17-9f86-85f714b4b9f8',
            disabled: false,
          },
        })
        openModalSpy = jest.spyOn(wrapper.vm, 'openModal')
        wrapper
          .findAll('.ds-menu-item')
          .filter((item) => item.text() === 'disable.user.title')
          .at(0)
          .trigger('click')
        expect(openModalSpy).toHaveBeenCalledWith('disable')
      })

      it('can disable organizations', async () => {
        const wrapper = await openContentMenu({
          isOwner: false,
          resourceType: 'organization',
          resource: {
            id: 'd23a4265-f5f7-4e17-9f86-85f714b4b9f8',
            disabled: false,
          },
        })
        openModalSpy = jest.spyOn(wrapper.vm, 'openModal')
        wrapper
          .findAll('.ds-menu-item')
          .filter((item) => item.text() === 'disable.organization.title')
          .at(0)
          .trigger('click')
        expect(openModalSpy).toHaveBeenCalledWith('disable')
      })

      it('can release posts', async () => {
        const wrapper = await openContentMenu({
          isOwner: false,
          resourceType: 'contribution',
          resource: {
            id: 'd23a4265-f5f7-4e17-9f86-85f714b4b9f8',
            disabled: true,
          },
        })
        openModalSpy = jest.spyOn(wrapper.vm, 'openModal')
        wrapper
          .findAll('.ds-menu-item')
          .filter((item) => item.text() === 'release.contribution.title')
          .at(0)
          .trigger('click')
        expect(openModalSpy).toHaveBeenCalledWith('release')
      })

      it('can release comments', async () => {
        const wrapper = await openContentMenu({
          isOwner: false,
          resourceType: 'comment',
          resource: {
            id: 'd23a4265-f5f7-4e17-9f86-85f714b4b9f8',
            disabled: true,
          },
        })
        openModalSpy = jest.spyOn(wrapper.vm, 'openModal')
        wrapper
          .findAll('.ds-menu-item')
          .filter((item) => item.text() === 'release.comment.title')
          .at(0)
          .trigger('click')
        expect(openModalSpy).toHaveBeenCalledWith('release')
      })

      it('can release users', async () => {
        const wrapper = await openContentMenu({
          isOwner: false,
          resourceType: 'user',
          resource: {
            id: 'd23a4265-f5f7-4e17-9f86-85f714b4b9f8',
            disabled: true,
          },
        })
        openModalSpy = jest.spyOn(wrapper.vm, 'openModal')
        wrapper
          .findAll('.ds-menu-item')
          .filter((item) => item.text() === 'release.user.title')
          .at(0)
          .trigger('click')
        expect(openModalSpy).toHaveBeenCalledWith('release')
      })

      it('can release organizations', async () => {
        const wrapper = await openContentMenu({
          isOwner: false,
          resourceType: 'organization',
          resource: {
            id: 'd23a4265-f5f7-4e17-9f86-85f714b4b9f8',
            disabled: true,
          },
        })
        openModalSpy = jest.spyOn(wrapper.vm, 'openModal')
        wrapper
          .findAll('.ds-menu-item')
          .filter((item) => item.text() === 'release.organization.title')
          .at(0)
          .trigger('click')
        expect(openModalSpy).toHaveBeenCalledWith('release')
      })
    })

    describe('user', () => {
      it('can access settings', async () => {
        getters['auth/isAdmin'] = () => false
        getters['auth/isModerator'] = () => false
        const wrapper = await openContentMenu({
          isOwner: true,
          resourceType: 'user',
          resource: {
            id: 'd23a4265-f5f7-4e17-9f86-85f714b4b9f8',
          },
        })
        expect(
          wrapper
            .findAll('.ds-menu-item')
            .filter((item) => item.text() === 'settings.name')
            .at(0)
            .find('span.ds-menu-item-link')
            .attributes('to'),
        ).toBe('/settings')
      })

      it('can mute other users', async () => {
        const wrapper = await openContentMenu({
          isOwner: false,
          resourceType: 'user',
          resource: {
            id: 'd23a4265-f5f7-4e17-9f86-85f714b4b9f8',
            isMuted: false,
          },
        })
        wrapper
          .findAll('.ds-menu-item')
          .filter((item) => item.text() === 'settings.muted-users.mute')
          .at(0)
          .trigger('click')
        expect(wrapper.emitted('mute')).toEqual([
          [
            {
              id: 'd23a4265-f5f7-4e17-9f86-85f714b4b9f8',
              isMuted: false,
            },
          ],
        ])
      })

      it('can unmute muted users', async () => {
        const wrapper = await openContentMenu({
          isOwner: false,
          resourceType: 'user',
          resource: {
            id: 'd23a4265-f5f7-4e17-9f86-85f714b4b9f8',
            isMuted: true,
          },
        })
        wrapper
          .findAll('.ds-menu-item')
          .filter((item) => item.text() === 'settings.muted-users.unmute')
          .at(0)
          .trigger('click')
        expect(wrapper.emitted('unmute')).toEqual([
          [
            {
              id: 'd23a4265-f5f7-4e17-9f86-85f714b4b9f8',
              isMuted: true,
            },
          ],
        ])
      })
    })
  })
})
