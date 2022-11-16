import Vue from 'vue'
import { mount } from '@vue/test-utils'

import ShowPassword from './ShowPassword.vue'

describe('ShowPassword', () => {
  describe('State of show password icon', () => {
    const wrapper = mount(ShowPassword, {
      propsData: {
        iconName: 'eye',
      },
    })

    it('Shows eye icon by default', () => {
      expect(wrapper.find('.icon-wrapper').attributes('data-test')).toEqual('eye')
    })

    describe('After click', () => {
      it('Password wrapper emits show-password event', async () => {
        wrapper.find('.click-wrapper').trigger('click')
        await Vue.nextTick()
        expect(wrapper.emitted()).toBeTruthy()
      })

      it('Shows the slash-eye icon after click', async () => {
        wrapper.find('.click-wrapper').trigger('click')
        wrapper.setProps({ iconName: 'eye-slash' })
        await Vue.nextTick()
        expect(wrapper.find('.icon-wrapper').attributes('data-test')).toEqual('eye-slash')
      })
    })
  })
})
