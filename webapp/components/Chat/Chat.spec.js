import { mount } from '@vue/test-utils'
import Vuex from 'vuex'
import { getters, mutations } from '../../store/chat'

import Chat from './Chat'

const localVue = global.localVue
// const observer = {
//   subscribe: jest.fn(),
// }

describe('Chat', () => {
  let store
  let mocks
  let stubs
  beforeEach(() => {
    // Mocking any required data or dependencies
    stubs = {
      VueAdvancedChat: true,
      'client-only': true,
      'nuxt-link': true,
    }

    store = new Vuex.Store({
      // state,
      getters: {
        'auth/user': () => {
          return { id: 'u343', name: 'Matt' }
        },
        'chat/roomID': getters.roomID,
      },
      mutations: {
        'chat/UPDATE_ROOM_COUNT': mutations.UPDATE_ROOM_COUNT,
        'chat/UPDATE_ROOM_ID': mutations.UPDATE_ROOM_ID,
      },
    })

    mocks = {
      $t: jest.fn(),
      $toast: {
        success: jest.fn(),
        error: jest.fn(),
      },
      $apollo: {
        query: jest.fn().mockResolvedValue({}),
        mutate: jest.fn().mockResolvedValue({}),
        // TODO: https://stackoverflow.com/questions/58815471/in-jest-how-can-i-unit-test-a-method-that-subscribes-to-an-observable
        subscribe: jest.fn(),// () => { observer },
      }
    }
  })

  it('renders the Chat component', () => {
    const wrapper = mount(Chat, {
      store,
      stubs,
      mocks,
      localVue, 
      propsData: {}
    })
    expect(wrapper.exists()).toBe(true)
  })

  // Add more test cases for different scenarios or functionalities
  
})