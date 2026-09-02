import { mount } from '@vue/test-utils'
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
        await wrapper.vm.$nextTick()
        await wrapper.vm.$nextTick()

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

      // Typing on: the plugin re-runs and now finds its decoration, so the follow-up keystrokes take
      // the same direct path — with a filtered list behind it.
      it('re-anchors and re-filters while typing', () => {
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
        expect(typeof wrapper.vm.$refs.contextMenu.menu.show).toBe('function')
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

        // Opens without an anchor, so the lookup is deferred — and the list is dismissed within
        // that same tick, as Escape or a keystroke ending the match would.
        wrapper.vm.openSuggestionList(
          {
            items: propsData.users,
            query: '',
            range: { from: 1, to: 2 },
            command: jest.fn(),
            virtualNode: null,
            view,
          },
          'mention',
        )
        wrapper.vm.closeSuggestionList()
        await wrapper.vm.$nextTick()

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
