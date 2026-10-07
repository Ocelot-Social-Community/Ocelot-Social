import { mount } from '@vue/test-utils'
import SuggestionList from './SuggestionList'

const localVue = global.localVue

describe('SuggestionList.vue', () => {
  const peter = { id: 'u1', slug: 'peter-lustig', name: 'Peter Lustig', relation: 'participant' }
  const jenny = { id: 'u2', slug: 'jenny-rostock', name: 'Jenny Rostock', relation: 'following' }
  const bob = { id: 'u3', slug: 'bob', name: 'Bob der Baumeister', relation: 'following' }

  const Wrapper = (propsData) =>
    mount(SuggestionList, {
      localVue,
      propsData: {
        suggestionType: 'mention',
        filteredItems: [],
        query: '',
        navigatedItemIndex: 0,
        selectItem: jest.fn(),
        ...propsData,
      },
      mocks: { $t: (key) => key },
      // The row itself is what is under test here, not UserAvatar's dropdown machinery.
      stubs: {
        UserAvatar: { props: ['user'], template: '<span>{{ user.name }} @{{ user.slug }}</span>' },
      },
    })

  const rows = (wrapper) => wrapper.findAll('li').wrappers.map((li) => li.text())

  describe('mentions', () => {
    it('puts a heading before the first user of each relation', () => {
      const wrapper = Wrapper({ filteredItems: [peter, jenny, bob] })
      expect(rows(wrapper)).toEqual([
        'editor.mention.relation.participant',
        'Peter Lustig @peter-lustig',
        'editor.mention.relation.following',
        'Jenny Rostock @jenny-rostock',
        'Bob der Baumeister @bob',
      ])
    })

    it('makes headings non-selectable hints', () => {
      const wrapper = Wrapper({ filteredItems: [peter] })
      expect(wrapper.findAll('li').at(0).classes()).toContain('hint')
      expect(wrapper.findAll('li').at(1).classes()).not.toContain('hint')
    })

    // The index counts users only, so arrow keys never land on a heading.
    it('highlights by position among the users, not among the rows', () => {
      const wrapper = Wrapper({ filteredItems: [peter, jenny], navigatedItemIndex: 1 })
      const selected = wrapper.find('.is-selected')
      expect(selected.text()).toBe('Jenny Rostock @jenny-rostock')
    })

    it('selects the clicked user', async () => {
      const selectItem = jest.fn()
      const wrapper = Wrapper({ filteredItems: [peter, jenny], selectItem })
      await wrapper.findAll('li').at(3).trigger('click')
      expect(selectItem).toHaveBeenCalledWith(jenny)
    })

    describe('scrolling', () => {
      // jsdom has no layout: the rows get the geometry the scrolling is computed from.
      const layout = (wrapper, { height, rowHeight }) => {
        Object.defineProperty(wrapper.element, 'clientHeight', { value: height })
        wrapper.findAll('li').wrappers.forEach((li, position) => {
          Object.defineProperty(li.element, 'offsetTop', { value: position * rowHeight })
          Object.defineProperty(li.element, 'offsetHeight', { value: rowHeight })
        })
      }

      // The highlighted entry stays clear of the fading edges (56px), not merely inside the list.
      it('follows the highlight down and back up', async () => {
        const wrapper = Wrapper({ filteredItems: [peter, jenny, bob] })
        // Rows: heading, peter, heading, jenny, bob — 50px each, 200px visible.
        layout(wrapper, { height: 200, rowHeight: 50 })

        // bob ends at 250: 250 + 56 - 200.
        await wrapper.setProps({ navigatedItemIndex: 2 })
        await wrapper.vm.$nextTick()
        expect(wrapper.element.scrollTop).toBe(106)

        // jenny starts at 150, inside the top fade (106 + 56): 150 - 56.
        await wrapper.setProps({ navigatedItemIndex: 1 })
        await wrapper.vm.$nextTick()
        expect(wrapper.element.scrollTop).toBe(94)

        // The first entry scrolls all the way up, heading included.
        await wrapper.setProps({ navigatedItemIndex: 0 })
        await wrapper.vm.$nextTick()
        expect(wrapper.element.scrollTop).toBe(0)
      })
    })

    // Like the follower lists: an edge fades out only while the list goes on beyond it.
    describe('fading edges', () => {
      const mask = (top, bottom) =>
        `linear-gradient(to bottom, transparent, black ${top}, black calc(100% - ${bottom}), transparent)`
      const scrollTo = async (wrapper, scrollTop) => {
        wrapper.element.scrollTop = scrollTop
        await wrapper.trigger('scroll')
      }
      let wrapper

      beforeEach(() => {
        wrapper = Wrapper({ filteredItems: [peter, jenny, bob] })
        Object.defineProperty(wrapper.element, 'clientHeight', { value: 100 })
        Object.defineProperty(wrapper.element, 'scrollHeight', { value: 250 })
      })

      it('fades the bottom at the top of the list', async () => {
        await scrollTo(wrapper, 0)
        expect(wrapper.vm.scrollMaskStyle.maskImage).toBe(mask('0px', '56px'))
      })

      it('fades both edges in the middle', async () => {
        await scrollTo(wrapper, 50)
        expect(wrapper.vm.scrollMaskStyle.maskImage).toBe(mask('56px', '56px'))
      })

      it('fades the top at the end of the list', async () => {
        await scrollTo(wrapper, 150)
        expect(wrapper.vm.scrollMaskStyle.maskImage).toBe(mask('56px', '0px'))
      })

      it('fades nothing when everything fits', async () => {
        const short = Wrapper({ filteredItems: [peter] })
        Object.defineProperty(short.element, 'clientHeight', { value: 100 })
        Object.defineProperty(short.element, 'scrollHeight', { value: 100 })
        await scrollTo(short, 0)
        expect(short.vm.scrollMaskStyle.maskImage).toBe(mask('0px', '0px'))
      })
    })

    it('shows no heading for users without a relation', () => {
      const wrapper = Wrapper({ filteredItems: [{ id: 'u9', slug: 'nobody', name: 'Nobody' }] })
      expect(rows(wrapper)).toEqual(['Nobody @nobody'])
    })

    it('says so when nobody matches', () => {
      const wrapper = Wrapper({ query: 'xyz' })
      expect(rows(wrapper)).toEqual(['editor.mention.noUsersFound'])
    })

    it('does not say so while suggestions are still loading', () => {
      const wrapper = Wrapper({ query: 'xyz', loading: true })
      expect(rows(wrapper)).toEqual([])
      expect(wrapper.element.style.display).toBe('none')
    })
  })

  describe('hashtags', () => {
    it('lists the tags without headings and offers to add the typed one', () => {
      const wrapper = Wrapper({
        suggestionType: 'hashtag',
        filteredItems: [{ id: 'Frieden' }],
        query: 'Frie',
      })
      expect(rows(wrapper)).toEqual(['#Frieden', 'editor.hashtag.addHashtag', '#Frie'])
    })
  })
})
