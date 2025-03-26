import { mount } from '@vue/test-utils'
import { beforeEach, expect, describe, it } from 'jest'
import ObserveButton from './ObserveButton.vue'
// import Vue from 'vue'

describe('ObserveButton', () => {
  const Wrapper = (count = 1, postId = '123', isObserved = true) => {
    return mount(ObserveButton, {
      props: {
        count,
        postId,
        isObserved,
      },
    })
  }

  let wrapper

  beforeEach(() => {
    wrapper = Wrapper()
  })

  it('renders', () => {
    expect(wrapper.element).toMatchSnapshot()
  })

  /*
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
    */
})
