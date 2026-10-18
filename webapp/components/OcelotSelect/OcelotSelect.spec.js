import { mount } from '@vue/test-utils'
import OcelotSelect from './OcelotSelect.vue'

const localVue = global.localVue

describe('OcelotSelect', () => {
  const Wrapper = (propsData = {}) =>
    mount(OcelotSelect, {
      localVue,
      propsData: { options: [], value: '', placeholder: 'Pick one', ...propsData },
    })

  // Text typed into the search but never selected, once the select has closed again.
  const typeAndClose = async (wrapper, text) => {
    wrapper.vm.openAndFocus()
    wrapper.vm.searchString = text
    wrapper.vm.closeAndBlur()
    await wrapper.vm.$nextTick()
  }

  describe('closed with typed but unselected text', () => {
    it('shows the placeholder by default', async () => {
      const wrapper = Wrapper()
      await typeAndClose(wrapper, '7112 Duvin')

      expect(wrapper.find('.ds-select-placeholder').text()).toBe('Pick one')
      expect(wrapper.find('.ds-select-value').text()).not.toContain('7112 Duvin')
    })

    it('shows the typed text instead with keepSearchVisible', async () => {
      const wrapper = Wrapper({ keepSearchVisible: true })
      await typeAndClose(wrapper, '7112 Duvin')

      expect(wrapper.find('.ds-select-placeholder').exists()).toBe(false)
      expect(wrapper.find('.ds-select-value').text()).toBe('7112 Duvin')
    })

    it('still shows a selected value over the typed text', async () => {
      const wrapper = Wrapper({ keepSearchVisible: true, value: 'Berlin' })
      await typeAndClose(wrapper, 'Hamb')

      expect(wrapper.find('.ds-select-value').text()).toBe('Berlin')
    })
  })
})
