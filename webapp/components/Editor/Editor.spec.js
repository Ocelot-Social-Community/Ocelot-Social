import { mount } from '@vue/test-utils'
import flushPromises from 'flush-promises'
import Editor from './Editor'

import MutationObserver from 'mutation-observer'
import Vue from 'vue'

global.MutationObserver = MutationObserver

const localVue = global.localVue

const peter = { id: 'u1', slug: 'peter-lustig', name: 'Peter Lustig', relation: 'following' }
const jenny = { id: 'u2', slug: 'jenny-rostock', name: 'Jenny Rostock', relation: 'other' }

// UserAvatar (the rows of the mention list) brings a dropdown and <client-only> along; what is
// under test here is the editor around the list.
const stubs = { transition: false, UserAvatar: true }

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
      stubs,
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
        propsData.mentionSuggestions = jest.fn().mockResolvedValue([peter])
        wrapper = mount(Editor, {
          mocks,
          propsData,
          localVue,
          sync: false,
          stubs,
          attachTo: document.body,
        })

        const { view } = wrapper.vm.editor
        view.dispatch(view.state.tr.insertText('@'))
        await settle(wrapper.vm)

        const { menu } = wrapper.vm.$refs.contextMenu
        expect(menu).toBeTruthy()
        expect(typeof menu.show).toBe('function')
      })

      // Regression: the popup used to be anchored on the decoration span ITSELF — the one found in
      // the tick after the opening keystroke. prosemirror-view redraws that span right afterwards
      // (measured: once, in that same tick), so the popup measured an element that had left the
      // document — a 0/0 rect, i.e. the top left corner of the page. The reference has to follow
      // whichever span is in the document right now.
      it('measures the decoration that is currently in the document', async () => {
        propsData.mentionSuggestions = jest.fn().mockResolvedValue([peter])
        wrapper = mount(Editor, {
          mocks,
          propsData,
          localVue,
          sync: false,
          stubs,
          attachTo: document.body,
        })
        const { view } = wrapper.vm.editor
        const current = () => view.dom.querySelector('[data-decoration-id]')
        const rect = { top: 10, bottom: 30, left: 20, right: 40 }

        view.dispatch(view.state.tr.insertText('@'))
        const early = current()
        await settle(wrapper.vm)
        const redrawn = current()
        // jsdom has no layout: only the span that is in the document gets a real rect.
        redrawn.getBoundingClientRect = () => rect

        // The premise of the test — if prosemirror ever stops replacing the span, this goes first.
        expect(redrawn).not.toBe(early)
        expect(early.isConnected).toBe(false)
        expect(wrapper.vm.$refs.contextMenu.menu.reference.getBoundingClientRect()).toBe(rect)
      })

      // Between two redraws the span may be gone for a moment. Measuring then must not jump to 0/0.
      it('stays on the last known position while there is no decoration', async () => {
        propsData.mentionSuggestions = jest.fn().mockResolvedValue([peter])
        wrapper = mount(Editor, {
          mocks,
          propsData,
          localVue,
          sync: false,
          stubs,
          attachTo: document.body,
        })
        const { view } = wrapper.vm.editor
        const rect = { top: 10, bottom: 30, left: 20, right: 40 }

        view.dispatch(view.state.tr.insertText('@'))
        await settle(wrapper.vm)
        const span = view.dom.querySelector('[data-decoration-id]')
        span.getBoundingClientRect = () => rect
        const { reference } = wrapper.vm.$refs.contextMenu.menu
        reference.getBoundingClientRect()
        span.removeAttribute('data-decoration-id')

        expect(reference.getBoundingClientRect()).toBe(rect)
      })

      it('does not open a popup for a list that was closed before the anchor arrived', async () => {
        propsData.mentionSuggestions = jest.fn().mockResolvedValue([peter])
        wrapper = mount(Editor, {
          mocks,
          propsData,
          localVue,
          sync: false,
          stubs,
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
        wrapper.vm.showSuggestionMenu(view)
        wrapper.vm.closeSuggestionList()
        await settle(wrapper.vm)

        expect(wrapper.vm.$refs.contextMenu.menu).toBeFalsy()
      })
    })

    // The users offered for a mention are not handed in any more: the editor asks for them per
    // typed query. Driven through the handlers the Suggestions plugin calls, in the order it calls
    // them.
    describe('loading mention suggestions', () => {
      const props = (query) => ({
        items: [],
        query,
        range: { from: 1, to: 2 + query.length },
        command: jest.fn(),
      })
      let answers

      beforeEach(() => {
        jest.useFakeTimers()
        answers = {}
        // Each query gets a promise the test resolves by hand, to decide which answer arrives when.
        propsData.mentionSuggestions = jest.fn(
          (query) =>
            new Promise((resolve, reject) => {
              answers[query] = { resolve, reject }
            }),
        )
        wrapper = Wrapper()
      })

      afterEach(() => {
        jest.useRealTimers()
      })

      it('asks for the opening "@" right away', async () => {
        wrapper.vm.openSuggestionList(props(''), 'mention')
        expect(propsData.mentionSuggestions).toHaveBeenCalledWith('')
        expect(wrapper.vm.suggestionsLoading).toBe(true)

        answers[''].resolve([peter, jenny])
        await flushPromises()

        expect(wrapper.vm.filteredItems).toEqual([peter, jenny])
        expect(wrapper.vm.suggestionsLoading).toBe(false)
      })

      // An empty list looks like one that is just opening; typing on must still be debounced.
      it('still waits for a pause in typing after an answer without matches', async () => {
        wrapper.vm.openSuggestionList(props(''), 'mention')
        answers[''].resolve([])
        await flushPromises()

        wrapper.vm.updateSuggestionList(props('x'))
        wrapper.vm.updateSuggestionList(props('xy'))
        expect(propsData.mentionSuggestions).toHaveBeenCalledTimes(1)

        jest.advanceTimersByTime(150)
        expect(propsData.mentionSuggestions).toHaveBeenCalledTimes(2)
        expect(propsData.mentionSuggestions).toHaveBeenLastCalledWith('xy')
      })

      it('still waits for a pause in typing after a failed request', async () => {
        wrapper.vm.openSuggestionList(props(''), 'mention')
        answers[''].reject(new Error('network'))
        await flushPromises()

        wrapper.vm.updateSuggestionList(props('x'))
        expect(propsData.mentionSuggestions).toHaveBeenCalledTimes(1)

        jest.advanceTimersByTime(150)
        expect(propsData.mentionSuggestions).toHaveBeenCalledTimes(2)
      })

      it('waits for a pause in typing before it asks again', async () => {
        wrapper.vm.openSuggestionList(props(''), 'mention')
        answers[''].resolve([peter, jenny])
        await flushPromises()

        wrapper.vm.updateSuggestionList(props('p'))
        wrapper.vm.updateSuggestionList(props('pe'))
        expect(propsData.mentionSuggestions).toHaveBeenCalledTimes(1)

        jest.advanceTimersByTime(150)
        expect(propsData.mentionSuggestions).toHaveBeenCalledTimes(2)
        expect(propsData.mentionSuggestions).toHaveBeenLastCalledWith('pe')
      })

      // Enter picks the highlighted entry — it must not be someone the typed text has ruled out.
      it('narrows the list on screen until the answer is in', async () => {
        wrapper.vm.openSuggestionList(props(''), 'mention')
        answers[''].resolve([peter, jenny])
        await flushPromises()

        wrapper.vm.updateSuggestionList(props('je'))

        expect(wrapper.vm.filteredItems).toEqual([jenny])
        expect(wrapper.vm.suggestionsLoading).toBe(true)
      })

      it('drops an answer that was overtaken by a later query', async () => {
        wrapper.vm.openSuggestionList(props(''), 'mention')
        wrapper.vm.updateSuggestionList(props('je'))
        jest.advanceTimersByTime(150)

        answers.je.resolve([jenny])
        await flushPromises()
        answers[''].resolve([peter, jenny])
        await flushPromises()

        expect(wrapper.vm.filteredItems).toEqual([jenny])
      })

      it('drops an answer that arrives after the list was closed', async () => {
        wrapper.vm.openSuggestionList(props(''), 'mention')
        wrapper.vm.closeSuggestionList()

        answers[''].resolve([peter])
        await flushPromises()

        expect(wrapper.vm.filteredItems).toEqual([])
        expect(wrapper.vm.suggestionsLoading).toBe(false)
      })

      // Same kind of list, same query — but the answer was asked for by a list that is gone.
      it('drops an answer that arrives after the list was closed and opened again', async () => {
        wrapper.vm.openSuggestionList(props(''), 'mention')
        const first = answers['']
        wrapper.vm.closeSuggestionList()
        wrapper.vm.openSuggestionList(props(''), 'mention')

        first.resolve([peter])
        await flushPromises()
        expect(wrapper.vm.filteredItems).toEqual([])
        expect(wrapper.vm.suggestionsLoading).toBe(true)

        answers[''].resolve([jenny])
        await flushPromises()
        expect(wrapper.vm.filteredItems).toEqual([jenny])
      })

      it('does not ask twice for the same query while the list is open', async () => {
        wrapper.vm.openSuggestionList(props(''), 'mention')
        answers[''].resolve([peter, jenny])
        await flushPromises()
        wrapper.vm.updateSuggestionList(props('p'))
        jest.advanceTimersByTime(150)
        answers.p.resolve([peter])
        await flushPromises()

        // Backspace: back to the empty query.
        wrapper.vm.updateSuggestionList(props(''))

        expect(wrapper.vm.filteredItems).toEqual([peter, jenny])
        expect(propsData.mentionSuggestions).toHaveBeenCalledTimes(2)
      })

      it('shows an empty list when loading fails', async () => {
        wrapper.vm.openSuggestionList(props(''), 'mention')
        answers[''].reject(new Error('network'))
        await flushPromises()

        expect(wrapper.vm.filteredItems).toEqual([])
        expect(wrapper.vm.suggestionsLoading).toBe(false)
      })
    })

    describe('loading hashtag suggestions', () => {
      const frieden = { id: 'Frieden', relation: 'usedByMe' }
      const freiheit = { id: 'Freiheit', relation: 'popular' }
      const natur = { id: 'Natur', relation: 'popular' }
      const props = (query) => ({
        items: [],
        query,
        range: { from: 1, to: 2 + query.length },
        command: jest.fn(),
      })

      beforeEach(() => {
        jest.useFakeTimers()
        propsData.hashtagSuggestions = jest.fn().mockResolvedValue([frieden, freiheit, natur])
        propsData.mentionSuggestions = jest.fn().mockResolvedValue([peter])
        wrapper = Wrapper()
      })

      afterEach(() => {
        jest.useRealTimers()
      })

      // The plugin announces a suggestion once more right after one was inserted, with the range
      // of the replaced text — the cursor is no longer in it.
      describe('announced with the cursor outside its range', () => {
        const viewWithCursorAt = (from) => ({ state: { selection: { from } } })

        it('does not open a list or ask for suggestions', () => {
          wrapper.vm.openSuggestionList({ ...props('fr'), view: viewWithCursorAt(20) }, 'hashtag')

          expect(wrapper.vm.suggestionType).toBe('')
          expect(propsData.hashtagSuggestions).not.toHaveBeenCalled()
        })

        it('ignores the changes that follow it', () => {
          wrapper.vm.openSuggestionList({ ...props('fr'), view: viewWithCursorAt(20) }, 'hashtag')
          wrapper.vm.updateSuggestionList({ ...props('fri'), view: viewWithCursorAt(21) })
          jest.advanceTimersByTime(150)

          expect(wrapper.vm.suggestionRange).toBeNull()
          expect(propsData.hashtagSuggestions).not.toHaveBeenCalled()
        })
      })

      // The cache is keyed by what was typed: "#p" must not answer for "@p".
      it('starts every list from scratch', async () => {
        propsData.mentionSuggestions.mockResolvedValue([peter])
        wrapper.vm.openSuggestionList(props(''), 'hashtag')
        await flushPromises()

        wrapper.vm.openSuggestionList(props(''), 'mention')
        expect(wrapper.vm.filteredItems).toEqual([])
        await flushPromises()

        expect(propsData.mentionSuggestions).toHaveBeenCalledWith('')
        expect(wrapper.vm.filteredItems).toEqual([peter])
      })

      // Both kinds of list share one cache, keyed by what was typed.
      it('keeps a late answer for hashtags out of the cache of a mention list', async () => {
        let answerTags
        propsData.hashtagSuggestions.mockImplementation(
          () =>
            new Promise((resolve) => {
              answerTags = resolve
            }),
        )
        wrapper.vm.openSuggestionList(props(''), 'hashtag')
        wrapper.vm.openSuggestionList(props(''), 'mention')
        await flushPromises()
        answerTags([frieden])
        await flushPromises()

        // Typing and deleting a letter comes back to the query the tags were asked for.
        wrapper.vm.updateSuggestionList(props('p'))
        wrapper.vm.updateSuggestionList(props(''))

        expect(wrapper.vm.filteredItems).toEqual([peter])
      })

      it('asks the hashtag loader, not the one for mentions', async () => {
        wrapper.vm.openSuggestionList(props(''), 'hashtag')
        await flushPromises()

        expect(propsData.hashtagSuggestions).toHaveBeenCalledWith('')
        expect(propsData.mentionSuggestions).not.toHaveBeenCalled()
        expect(wrapper.vm.filteredItems).toEqual([frieden, freiheit, natur])
      })

      // The typed tag becomes an entry of the list, so arrow keys and Enter reach it.
      it('appends the typed tag as an entry when it does not exist yet', async () => {
        wrapper.vm.openSuggestionList(props(''), 'hashtag')
        await flushPromises()
        propsData.hashtagSuggestions.mockResolvedValue([frieden])

        wrapper.vm.updateSuggestionList(props('Frie'))
        jest.advanceTimersByTime(150)
        await flushPromises()

        expect(wrapper.vm.filteredItems).toEqual([frieden, { id: 'Frie', relation: 'new' }])
      })

      it('creates the typed tag on Enter when it is highlighted', async () => {
        const command = jest.fn()
        propsData.hashtagSuggestions.mockResolvedValue([])
        wrapper.vm.openSuggestionList({ ...props('Neu'), command }, 'hashtag')
        await flushPromises()

        wrapper.vm.navigateSuggestionList({ event: { keyCode: 13 } })

        expect(command).toHaveBeenCalledWith(
          expect.objectContaining({ attrs: { id: 'Neu', label: 'Neu' } }),
        )
      })

      it('narrows the list on screen by the start of the tag until the answer is in', async () => {
        wrapper.vm.openSuggestionList(props(''), 'hashtag')
        await flushPromises()

        wrapper.vm.updateSuggestionList(props('fr'))

        expect(wrapper.vm.filteredItems).toEqual([frieden, freiheit])
      })

      // The query the plugin hands over is sanitized first — only letters and digits make a tag.
      it('asks for the sanitized query', async () => {
        wrapper.vm.openSuggestionList(props(''), 'hashtag')
        await flushPromises()

        wrapper.vm.updateSuggestionList(props('fr-ie!'))
        jest.advanceTimersByTime(150)

        expect(propsData.hashtagSuggestions).toHaveBeenLastCalledWith('frie')
      })
    })

    // Regression: with the list open, moving the focus elsewhere hid it for good — tippy hid its
    // instance on the outside click, the editor still held one and so never showed it again.
    describe('leaving and re-entering the editor with the list open', () => {
      let menu

      beforeEach(async () => {
        propsData.mentionSuggestions = jest.fn().mockResolvedValue([peter])
        wrapper = mount(Editor, {
          mocks,
          propsData,
          localVue,
          sync: false,
          stubs,
          attachTo: document.body,
        })
        const { view } = wrapper.vm.editor
        view.dispatch(view.state.tr.insertText('@'))
        await wrapper.vm.$nextTick()
        await wrapper.vm.$nextTick()
        await flushPromises()
        menu = wrapper.vm.$refs.contextMenu.menu
        jest.spyOn(menu, 'hide')
        jest.spyOn(menu, 'show')
      })

      it('does not leave hiding to a click outside', () => {
        expect(menu.props.hideOnClick).toBe(false)
      })

      it('hides the list on blur and keeps it', () => {
        wrapper.vm.editor.emit('blur', {})
        expect(menu.hide).toHaveBeenCalled()
        expect(wrapper.vm.$refs.contextMenu.menu).toBe(menu)
      })

      it('shows the list again on focus', () => {
        wrapper.vm.editor.emit('blur', {})
        wrapper.vm.editor.emit('focus', {})
        expect(menu.show).toHaveBeenCalled()
      })

      it('shows nothing on focus once the list was closed', () => {
        wrapper.vm.closeSuggestionList()
        wrapper.vm.editor.emit('focus', {})
        expect(menu.show).not.toHaveBeenCalled()
        expect(wrapper.vm.$refs.contextMenu.menu).toBeFalsy()
      })
    })

    describe('optional extensions', () => {
      it('assigns the Mention extension when it can load suggestions', () => {
        propsData.mentionSuggestions = jest.fn().mockResolvedValue([])
        wrapper = Wrapper()
        expect(wrapper.vm.editor.extensions.options).toEqual(
          expect.objectContaining({ mention: expect.anything() }),
        )
      })

      it('mentions is not an option when suggestions cannot be loaded', () => {
        expect(wrapper.vm.editor.extensions.options).toEqual(
          expect.not.objectContaining({
            mention: expect.anything(),
          }),
        )
      })

      it('assigns the Hashtag extension when it can load suggestions', () => {
        propsData.hashtagSuggestions = jest.fn().mockResolvedValue([])
        wrapper = Wrapper()
        expect(wrapper.vm.editor.extensions.options).toEqual(
          expect.objectContaining({ hashtag: expect.anything() }),
        )
      })

      it('hashtags is not an option when suggestions cannot be loaded', () => {
        expect(wrapper.vm.editor.extensions.options).toEqual(
          expect.not.objectContaining({
            hashtag: expect.anything(),
          }),
        )
      })
    })
  })
})
