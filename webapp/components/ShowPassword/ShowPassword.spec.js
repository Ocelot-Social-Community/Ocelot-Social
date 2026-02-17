import Vue from 'vue'
import { mount } from '@vue/test-utils'
import { OsIcon } from '@ocelot-social/ui'
import { ocelotIcons } from '@ocelot-social/ui/ocelot'

import ShowPassword from './ShowPassword.vue'

describe('ShowPassword', () => {
  describe('State of show password icon', () => {
    const wrapper = mount(ShowPassword, {
      propsData: {
        icon: ocelotIcons.eye,
      },
    })

    it('Shows eye icon by default', () => {
      expect(wrapper.findComponent(OsIcon).props().icon).toBe(ocelotIcons.eye)
    })

    describe('After click', () => {
      it('Password wrapper emits show-password event', async () => {
        wrapper.find('.click-wrapper').trigger('click')
        await Vue.nextTick()
        expect(wrapper.emitted('show-password')).toBeTruthy()
      })

      it('Shows the slash-eye icon after click', async () => {
        wrapper.find('.click-wrapper').trigger('click')
        await wrapper.setProps({ icon: ocelotIcons.eyeSlash })
        expect(wrapper.findComponent(OsIcon).props().icon).toBe(ocelotIcons.eyeSlash)
      })
    })
  })
})
