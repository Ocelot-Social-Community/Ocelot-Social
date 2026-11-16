import { mount } from '@vue/test-utils'
import { TextSelection } from 'prosemirror-state'

import MutationObserver from 'mutation-observer'
import Vue from 'vue'

// Cmd+K on a Mac (#4666). prosemirror-keymap decides once, when it is first loaded, whether `Mod`
// means Cmd or Ctrl, from navigator.platform. jsdom reports none, so the platform is set here and
// the editor is loaded only afterwards: with `require`, because an `import` would be hoisted above
// this line.
Object.defineProperty(window.navigator, 'platform', { value: 'MacIntel', configurable: true })
const Editor = require('./Editor').default

global.MutationObserver = MutationObserver

const localVue = global.localVue
const stubs = { transition: false, UserAvatar: true }

describe('Editor.vue on a Mac', () => {
  let wrapper

  const pressKey = (key, modifiers) => {
    const event = new KeyboardEvent('keydown', {
      key,
      bubbles: true,
      cancelable: true,
      ...modifiers,
    })
    wrapper.vm.editor.view.dom.dispatchEvent(event)
    return event
  }

  beforeEach(async () => {
    wrapper = mount(Editor, {
      mocks: { $t: (key) => key },
      propsData: { value: '<p>Example text</p>' },
      localVue,
      sync: false,
      stubs,
    })
    await Vue.nextTick()
    const { state, dispatch } = wrapper.vm.editor.view
    dispatch(state.tr.setSelection(TextSelection.create(state.doc, 1, state.doc.content.size - 1)))
    await Vue.nextTick()
  })

  afterEach(() => wrapper.destroy())

  // Shows that the platform above took effect: Cmd+B only means bold where `Mod` is Cmd.
  it('makes the selection bold with Cmd+B', async () => {
    const event = pressKey('b', { metaKey: true })
    await Vue.nextTick()
    expect(event.defaultPrevented).toBe(true)
    expect(wrapper.vm.editor.getHTML()).toBe('<p><strong>Example text</strong></p>')
  })

  it('opens the link input with Cmd+K', async () => {
    const event = pressKey('k', { metaKey: true })
    await Vue.nextTick()
    await Vue.nextTick()
    expect(event.defaultPrevented).toBe(true)
    expect(wrapper.vm.isLinkInputActive).toBe(true)
    expect(wrapper.vm.$refs.contextMenu.menu).toBeTruthy()
  })

  it('leaves Ctrl+K alone', async () => {
    const event = pressKey('k', { ctrlKey: true })
    await Vue.nextTick()
    await Vue.nextTick()
    expect(event.defaultPrevented).toBe(false)
    expect(wrapper.vm.isLinkInputActive).toBe(false)
  })
})
