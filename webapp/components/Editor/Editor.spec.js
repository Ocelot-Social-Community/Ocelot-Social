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
