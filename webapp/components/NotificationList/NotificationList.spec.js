import { shallowMount, mount, RouterLinkStub } from '@vue/test-utils'
import NotificationList from './NotificationList'
import Notification from '../Notification/Notification'
import Vuex from 'vuex'

import { notifications } from '~/components/utils/Notifications'

const localVue = global.localVue

localVue.filter('truncate', (string) => string)

describe('NotificationList.vue', () => {
  let wrapper
  let mocks
  let stubs
  let store
  let propsData

  beforeEach(() => {
    store = new Vuex.Store({
      getters: {
        'auth/isModerator': () => false,
        'auth/user': () => {
          return {}
        },
      },
    })
    mocks = {
      $t: jest.fn(),
    }
    stubs = {
      NuxtLink: RouterLinkStub,
      'client-only': true,
      'v-popover': true,
    }
    propsData = { notifications }
  })

  describe('shallowMount', () => {
    const Wrapper = () => {
      return shallowMount(NotificationList, {
        propsData,
        mocks,
        store,
        localVue,
        stubs,
      })
    }

    beforeEach(() => {
      wrapper = Wrapper()
    })

    it('renders Notification.vue for each notification of the user', () => {
      expect(wrapper.findAll(Notification)).toHaveLength(2)
    })
  })

  describe('mount', () => {
    const Wrapper = () => {
      return mount(NotificationList, {
        propsData,
        mocks,
        stubs,
        store,
        localVue,
      })
    }

    beforeEach(() => {
      wrapper = Wrapper()
    })

    describe('click on a notification', () => {
      beforeEach(() => {
        wrapper.find('.notification > .link').trigger('click')
      })

      it("emits 'markAsRead' with the id of the notification source", () => {
        expect(wrapper.emitted('markAsRead')[0]).toEqual(['post-1'])
      })
    })
  })

  describe('shallowMount with no notifications', () => {
    const Wrapper = () => {
      return shallowMount(NotificationList, {
        propsData: {},
        mocks,
        store,
        localVue,
      })
    }

    beforeEach(() => {
      wrapper = Wrapper()
    })

    it('renders Notification.vue zero times', () => {
      expect(wrapper.findAll(Notification)).toHaveLength(0)
    })
  })
})
