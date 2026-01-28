import { mount, RouterLinkStub } from '@vue/test-utils'

import Component from './CtaJoinLeaveGroup.vue'

const localVue = global.localVue

describe('CtaJoinLeaveGroup.vue', () => {
  let propsData, wrapper, mocks, stubs

  beforeEach(() => {
    propsData = {
      group: {
        id: 'g-123',
        slug: 'group-123',
        name: 'Group 123',
        myRole: null,
      },
    }
    mocks = {
      $t: jest.fn((t) => t),
      $store: {
        getters: {
          'auth/user': {
            id: 'u-1',
          },
        },
      },
      $apollo: {
        mutate: jest.fn(),
      },
    }
    stubs = {
      NuxtLink: RouterLinkStub,
    }
  })

  const Wrapper = () => {
    return mount(Component, { propsData, localVue, mocks, stubs })
  }

  describe('mount', () => {
    beforeEach(() => {
      wrapper = Wrapper()
    })

    it('renders', () => {
      expect(wrapper).toMatchSnapshot()
    })

    describe('clicking on button', () => {
      beforeEach(async () => {
        mocks.$apollo.mutate = jest.fn().mockResolvedValue({
          data: {
            JoinGroup: {
              user: {
                id: 'g-123',
                slug: 'group-123',
                name: 'Group 123',
              },
              membership: {
                role: 'usual',
              },
            },
          },
        })
        wrapper.find('.base-button').trigger('click')
        await wrapper.vm.$nextTick()
      })
      it('emits update event', async () => {
        expect(wrapper.emitted().update).toEqual([
          [
            {
              user: {
                id: 'g-123',
                slug: 'group-123',
                name: 'Group 123',
              },
              membership: {
                role: 'usual',
              },
            },
          ],
        ])
      })
    })
  })
})
