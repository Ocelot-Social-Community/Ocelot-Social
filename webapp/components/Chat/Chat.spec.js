import { mount } from '@vue/test-utils'
import Vuex from 'vuex'
import { mapGetters as getters, mapMutations as mutations } from 'vuex'

import Chat from './Chat'

const localVue = global.localVue

describe('MyComponent', () => {
  it('should fetch rooms and update rooms data correctly', async () => {
    // Mock the Apollo query to return a specific response
    const apolloMock = {
      query: jest.fn().mockResolvedValue({
        data: {
          Room: [
            { id: 1, name: 'Room 1' },
            { id: 2, name: 'Room 2' },
          ],
        },
      }),
      subscribe: jest.fn(),
    }

    // Mount the component and pass the mock apollo instance
    const wrapper = mount(Chat, {
      mocks: {
        $apollo: apolloMock,
      },
    })

    // Call the fetchRooms method
    await wrapper.vm.fetchRooms()

    // Assert that the rooms data has been updated correctly
    expect(wrapper.vm.rooms).toEqual([
      { id: 1, name: 'Room 1' },
      { id: 2, name: 'Room 2' },
    ])
    expect(wrapper.vm.roomsLoaded).toBeTruthy()
  })

  it('should handle failed fetch and show error message', async () => {
    // Mock the Apollo query to throw an error
    const apolloMock = {
      query: jest.fn().mockRejectedValue(new Error('Fetch failed')),
      subscribe: jest.fn(),
    }

    // Mount the component and pass the mock apollo instance
    const wrapper = mount(Chat, {
      mocks: {
        $apollo: apolloMock,
        $toast: {
          error: jest.fn(),
        },
      },
    })

    // Call the fetchRooms method
    await wrapper.vm.fetchRooms()

    // Assert that the rooms data is empty and error message is shown
    expect(wrapper.vm.rooms).toEqual([])
    expect(wrapper.vm.$toast.error).toHaveBeenCalledWith('Fetch failed')
  })
})