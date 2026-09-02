import { mount } from '@vue/test-utils'
import flushPromises from 'flush-promises'
import Editor from './Editor'

import MutationObserver from 'mutation-observer'
import Vue from 'vue'

global.MutationObserver = MutationObserver

const localVue = global.localVue

describe('Editor.vue', () => {
  let wrapper
  let propsData
  let mocks

  const Wrapper = () => {
    return (wrapper = mount(Editor, {
      mocks,
      propsData,
      localVue,
      sync: false,
      stubs: {
        transition: false,
      },
    }))
  }

  beforeEach(() => {
    propsData = {}
    mocks = {
      $t: () => 'some cool placeholder',
    }
    wrapper = Wrapper()
  })

  describe('mount', () => {
    it('renders', () => {
      expect(Wrapper().element.tagName).toBe('DIV')
    })

    describe('given a piece of text', () => {
      beforeEach(() => {
        propsData.value = 'I am a piece of text'
      })

      it('renders', async () => {
        wrapper = Wrapper()
        await Vue.nextTick().then(() => {
          expect(wrapper.find('.editor-content').text()).toContain(propsData.value)
        })
      })
    })

    it('translates the placeholder', () => {
      expect(wrapper.vm.editor.extensions.options.placeholder.emptyNodeText).toEqual(
        'some cool placeholder',
      )
    })

    // Regression: typing the "@" that opens the mention list used to throw
    // "this.menu.show is not a function" — tiptap's Suggestions plugin looks its decoration span up
    // in the DOM before prosemirror-view has written it (since prosemirror-view 1.42), hands over a
    // null anchor, and `tippy(null)` answers with an empty array rather than an instance. The popup
    // has to open regardless of which of the two the anchor comes from.
    describe('opening the mention suggestion list', () => {
      // Both the popup and its absence have to be judged at the SAME point in time: the deferred
      // anchor lookup runs in a $nextTick, and prosemirror needs a tick of its own before the
      // decoration is in the DOM. A negative assertion that stops earlier than the positive one
      // would pass simply by looking too soon.
      const settle = async (vm) => {
        await vm.$nextTick()
        await vm.$nextTick()
        await flushPromises()
      }

      it('anchors the popup even when the plugin has no decoration node yet', async () => {
        propsData.users = [{ id: 'u1', slug: 'peter-lustig', label: 'Peter Lustig' }]
        wrapper = mount(Editor, {
          mocks,
          propsData,
          localVue,
          sync: false,
          stubs: { transition: false },
          attachTo: document.body,
        })

        const { view } = wrapper.vm.editor
        view.dispatch(view.state.tr.insertText('@'))
        await settle(wrapper.vm)

        const { menu } = wrapper.vm.$refs.contextMenu
        expect(menu).toBeTruthy()
        expect(typeof menu.show).toBe('function')
      })

      // The other half of showSuggestionMenu: once the decoration IS in the DOM, the plugin builds
      // the anchor itself and hands it over as `virtualNode` — a popper-style virtual reference
      // rather than an element. That path must not wait for a tick, and tippy has to accept the
      // object as a single instance (the same call answers with an array for anything invalid).
      it('uses the plugin anchor directly when it comes with one', async () => {
        propsData.users = [{ id: 'u1', slug: 'peter-lustig', label: 'Peter Lustig' }]
        wrapper = mount(Editor, {
          mocks,
          propsData,
          localVue,
          sync: false,
          stubs: { transition: false },
          attachTo: document.body,
        })
        const rect = { top: 10, bottom: 30, left: 20, right: 40, width: 20, height: 20 }
        const virtualNode = {
          getBoundingClientRect: () => rect,
          clientWidth: rect.width,
          clientHeight: rect.height,
        }

        wrapper.vm.openSuggestionList(
          {
            items: propsData.users,
            query: '',
            range: { from: 1, to: 2 },
            command: jest.fn(),
            virtualNode,
          },
          'mention',
        )

        // No $nextTick in between: the anchor was there, so the popup is up already.
        const { menu } = wrapper.vm.$refs.contextMenu
        expect(menu).toBeTruthy()
        expect(typeof menu.show).toBe('function')
      })

      // Typing on: the plugin re-runs, finds its decoration, and the follow-up keystrokes take the
      // direct path — with a filtered list behind it.
      it('anchors the popup on the reference the plugin passes while typing', () => {
        propsData.users = [
          { id: 'u1', slug: 'peter-lustig', label: 'Peter Lustig' },
          { id: 'u2', slug: 'jenny-rostock', label: 'Jenny Rostock' },
        ]
        wrapper = mount(Editor, {
          mocks,
          propsData,
          localVue,
          sync: false,
          stubs: { transition: false },
          attachTo: document.body,
        })
        const rect = { top: 10, bottom: 30, left: 20, right: 40, width: 20, height: 20 }
        const virtualNode = {
          getBoundingClientRect: () => rect,
          clientWidth: rect.width,
          clientHeight: rect.height,
        }

        wrapper.vm.updateSuggestionList({
          items: [propsData.users[1]],
          query: 'jenny',
          range: { from: 1, to: 7 },
          virtualNode,
          view: wrapper.vm.editor.view,
        })

        expect(wrapper.vm.filteredItems).toEqual([propsData.users[1]])
        expect(wrapper.vm.navigatedItemIndex).toBe(0)
        // The reference itself, not just "some popup exists": this fails if showSuggestionMenu ever
        // drops the handed-in `virtualNode` and anchors somewhere else.
        expect(wrapper.vm.$refs.contextMenu.menu.reference).toBe(virtualNode)
      })

      // Worth pinning down because it reads like a bug and is not one: displayContextMenu returns
      // early while a menu is open, so a later keystroke does NOT move the popup to the new
      // reference. It stays on the first one and popper repositions it from there — that is what
      // the MutationObserver in ContextMenu.vue is for.
      it('keeps an open popup on its first reference', () => {
        propsData.users = [{ id: 'u1', slug: 'peter-lustig', label: 'Peter Lustig' }]
        wrapper = mount(Editor, {
          mocks,
          propsData,
          localVue,
          sync: false,
          stubs: { transition: false },
          attachTo: document.body,
        })
        const nodeAt = (top) => ({
          getBoundingClientRect: () => ({
            top,
            bottom: top + 20,
            left: 20,
            right: 40,
            width: 20,
            height: 20,
          }),
          clientWidth: 20,
          clientHeight: 20,
        })
        const first = nodeAt(10)
        const second = nodeAt(100)
        const args = (virtualNode, query) => ({
          items: propsData.users,
          query,
          range: { from: 1, to: 1 + query.length + 1 },
          virtualNode,
          view: wrapper.vm.editor.view,
        })

        wrapper.vm.updateSuggestionList(args(first, ''))
        wrapper.vm.updateSuggestionList(args(second, 'p'))

        expect(wrapper.vm.$refs.contextMenu.menu.reference).toBe(first)
      })

      it('does not open a popup for a list that was closed before the anchor arrived', async () => {
        propsData.users = [{ id: 'u1', slug: 'peter-lustig', label: 'Peter Lustig' }]
        wrapper = mount(Editor, {
          mocks,
          propsData,
          localVue,
          sync: false,
          stubs: { transition: false },
          attachTo: document.body,
        })
        const { view } = wrapper.vm.editor

        // Type for real first, so the decoration is in the DOM: the deferred lookup WOULD find an
        // anchor here, which is what makes the guard observable at all.
        view.dispatch(view.state.tr.insertText('@'))
        await settle(wrapper.vm)
        wrapper.vm.$refs.contextMenu.hideContextMenu()

        // Then the sequence the guard is for: a lookup is scheduled, and the list is dismissed
        // before the tick that resolves it — Escape, or a keystroke that ends the match.
        // Driven through showSuggestionMenu directly because since prosemirror-view 1.42 the
        // plugin's update() runs asynchronously after `dispatch`, so a close placed right after a
        // keystroke lands BEFORE the list even opens (measured) and would prove nothing.
        wrapper.vm.showSuggestionMenu(null, view)
        wrapper.vm.closeSuggestionList()
        await settle(wrapper.vm)

        expect(wrapper.vm.$refs.contextMenu.menu).toBeFalsy()
      })
    })

    describe('optional extensions', () => {
      it('sets the Mention items to the users', () => {
        propsData.users = [
          {
            id: 'u345',
          },
        ]
        wrapper = Wrapper()
        expect(wrapper.vm.editor.extensions.options.mention.items()).toEqual(propsData.users)
      })

      it('mentions is not an option when there are no users', () => {
        expect(wrapper.vm.editor.extensions.options).toEqual(
          expect.not.objectContaining({
            mention: expect.anything(),
          }),
        )
      })

      describe('limists suggestion list to 15 users', () => {
        beforeEach(() => {
          const manyUsersList = []
          for (let i = 0; i < 25; i++) {
            manyUsersList.push({ id: `user${i}` })
          }
          propsData.users = manyUsersList
          wrapper = Wrapper()
        })

        it('when query is empty', () => {
          expect(
            wrapper.vm.editor.extensions.options.mention.onFilter(propsData.users),
          ).toHaveLength(15)
        })

        it('when query is present', () => {
          expect(
            wrapper.vm.editor.extensions.options.mention.onFilter(propsData.users, 'user'),
          ).toHaveLength(15)
        })
      })

      it('suggestion list returns results prefixed by query', () => {
        const manyUsersList = []
        for (let i = 0; i < 10; i++) {
          manyUsersList.push({ id: `user${i}` })
          manyUsersList.push({ id: `admin${i}` })
          manyUsersList.push({ id: `moderator${i}` })
        }
        propsData.users = manyUsersList
        wrapper = Wrapper()
        const suggestionList = wrapper.vm.editor.extensions.options.mention.onFilter(
          propsData.users,
          'moderator',
        )
        expect(suggestionList).toHaveLength(10)
        for (var i = 0; i < suggestionList.length; i++) {
          expect(suggestionList[i].id).toMatch(/^moderator.*/)
        }
      })

      it('exact match appears at the top of suggestion list', () => {
        const manyUsersList = []
        for (let i = 0; i < 25; i++) {
          manyUsersList.push({ id: `user${i}` })
        }
        propsData.users = manyUsersList
        wrapper = Wrapper()
        expect(
          wrapper.vm.editor.extensions.options.mention.onFilter(propsData.users, 'user7')[0].id,
        ).toMatch('user7')
      })

      it('sets the Hashtag items to the hashtags', () => {
        propsData.hashtags = [
          {
            id: 'Frieden',
          },
        ]
        wrapper = Wrapper()
        expect(wrapper.vm.editor.extensions.options.hashtag.items()).toEqual(propsData.hashtags)
      })

      it('hashtags is not an option when there are no hashtags', () => {
        expect(wrapper.vm.editor.extensions.options).toEqual(
          expect.not.objectContaining({
            hashtag: expect.anything(),
          }),
        )
      })

      describe('limists suggestion list to 15 hashtags', () => {
        beforeEach(() => {
          const manyHashtagsList = []
          for (let i = 0; i < 25; i++) {
            manyHashtagsList.push({ id: `hashtag${i}` })
          }
          propsData.hashtags = manyHashtagsList
          wrapper = Wrapper()
        })

        it('when query is empty', () => {
          expect(
            wrapper.vm.editor.extensions.options.hashtag.onFilter(propsData.hashtags),
          ).toHaveLength(15)
        })

        it('when query is present', () => {
          expect(
            wrapper.vm.editor.extensions.options.hashtag.onFilter(propsData.hashtags, 'hashtag'),
          ).toHaveLength(15)
        })
      })
    })
  })
})
