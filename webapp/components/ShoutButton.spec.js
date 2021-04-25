import { mount } from '@vue/test-utils'
import ShoutButton from './ShoutButton.vue'
import Vue from 'vue'

const localVue = global.localVue

describe('ShoutButton.vue', () => {
  let mocks

  beforeEach(() => {
    mocks = {
      $t: jest.fn(),
      $apollo: {
        mutate: jest.fn(),
      },
    }
  })

  describe('mount', () => {
    let wrapper
    const Wrapper = () => {
      return mount(ShoutButton, { mocks, localVue })
    }

    beforeEach(() => {
      wrapper = Wrapper()
    })

    it('renders button and text', () => {
      expect(mocks.$t).toHaveBeenCalledWith('shoutButton.shouted')
      expect(wrapper.findAll('.base-button')).toHaveLength(1)
      expect(wrapper.findAll('.shout-button-text')).toHaveLength(1)
      expect(wrapper.vm.shouted).toBe(false)
      expect(wrapper.vm.shoutedCount).toBe(0)
    })

    it('toggle the button', async () => {
      mocks.$apollo.mutate = jest.fn().mockResolvedValue({ data: { shout: 'WeDoShout' } })
      wrapper.find('.base-button').trigger('click')
      expect(wrapper.vm.shouted).toBe(true)
      expect(wrapper.vm.shoutedCount).toBe(1)
      await Vue.nextTick()
      expect(wrapper.vm.shouted).toBe(true)
      expect(wrapper.vm.shoutedCount).toBe(1)
    })

    it('toggle the button, but backend fails', async () => {
      mocks.$apollo.mutate = jest.fn().mockRejectedValue({ message: 'Ouch!' })
      await wrapper.find('.base-button').trigger('click')
      expect(wrapper.vm.shouted).toBe(true)
      expect(wrapper.vm.shoutedCount).toBe(1)
      await Vue.nextTick()
      expect(wrapper.vm.shouted).toBe(false)
      expect(wrapper.vm.shoutedCount).toBe(0)
    })
  })
})
