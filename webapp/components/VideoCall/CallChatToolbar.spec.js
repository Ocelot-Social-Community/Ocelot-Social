import { mount } from '@vue/test-utils'
import CallChatToolbar, { CALL_CHAT_TOOLBAR_HEIGHT } from './CallChatToolbar.vue'

const localVue = global.localVue

describe('CallChatToolbar', () => {
  let wrapper
  const Wrapper = (propsData = {}) =>
    mount(CallChatToolbar, { localVue, propsData, mocks: { $t: (key) => key } })
  const download = () => wrapper.find('[data-test="call-chat-export"]')

  afterEach(() => {
    wrapper.destroy()
  })

  it('offers the download of the chat, its name told to a screen reader', () => {
    wrapper = Wrapper()
    expect(download().exists()).toBe(true)
    expect(download().attributes('aria-label')).toBe('chat.exportChat')
  })

  it('leaves the download to the host, which holds the chat', async () => {
    wrapper = Wrapper()
    await download().trigger('click')
    expect(wrapper.emitted('export')).toHaveLength(1)
  })

  it('shows a download under way', () => {
    wrapper = Wrapper({ exporting: true })
    expect(download().attributes('aria-busy')).toBe('true')
  })

  it('tells its height, for a host that counts it in', () => {
    expect(CALL_CHAT_TOOLBAR_HEIGHT).toBe(31)
  })
})
