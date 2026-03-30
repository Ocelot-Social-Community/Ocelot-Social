import { mount } from '@vue/test-utils'
import AddChatRoomByUserSearch from './AddChatRoomByUserSearch.vue'

const localVue = global.localVue

const stubs = {
  'os-button': { template: '<button @click="$listeners.click && $listeners.click()"><slot /><slot name="icon" /></button>' },
  'os-icon': { template: '<span />' },
  'os-badge': { template: '<span><slot /></span>' },
  'profile-avatar': { template: '<div />' },
  'ocelot-select': {
    template: '<div class="ocelot-select"><slot /><slot name="option" :option="{ name: \'test\' }" /></div>',
    props: ['value', 'options', 'loading', 'filter', 'placeholder', 'noOptionsAvailable'],
  },
}

describe('AddChatRoomByUserSearch.vue', () => {
  let wrapper, mocks

  beforeEach(() => {
    mocks = {
      $t: jest.fn((key) => key),
      $apollo: {
        queries: {
          searchChatTargets: { loading: false },
        },
      },
    }
  })

  const Wrapper = () => {
    return mount(AddChatRoomByUserSearch, {
      localVue,
      mocks,
      stubs,
    })
  }

  describe('mount', () => {
    it('renders', () => {
      wrapper = Wrapper()
      expect(wrapper.exists()).toBe(true)
    })

    it('shows search headline', () => {
      wrapper = Wrapper()
      expect(mocks.$t).toHaveBeenCalledWith('chat.addRoomHeadline')
    })
  })

  describe('startSearch computed', () => {
    beforeEach(() => {
      wrapper = Wrapper()
    })

    it('returns false for empty query', () => {
      wrapper.vm.query = ''
      expect(wrapper.vm.startSearch).toBeFalsy()
    })

    it('returns false for short query', () => {
      wrapper.vm.query = 'ab'
      expect(wrapper.vm.startSearch).toBe(false)
    })

    it('returns true for query with 3+ characters', () => {
      wrapper.vm.query = 'abc'
      expect(wrapper.vm.startSearch).toBe(true)
    })
  })

  describe('handleInput', () => {
    beforeEach(() => {
      wrapper = Wrapper()
    })

    it('sets query from event target', () => {
      wrapper.vm.handleInput({ target: { value: '  hello  ' } })
      expect(wrapper.vm.query).toBe('hello')
    })

    it('sets empty string when no target', () => {
      wrapper.vm.handleInput({})
      expect(wrapper.vm.query).toBe('')
    })

    it('clears results when query is too short', () => {
      wrapper.vm.results = [{ id: '1' }]
      wrapper.vm.handleInput({ target: { value: 'ab' } })
      expect(wrapper.vm.results).toEqual([])
    })
  })

  describe('onDelete', () => {
    beforeEach(() => {
      wrapper = Wrapper()
    })

    it('clears when value is empty', () => {
      wrapper.vm.query = 'test'
      wrapper.vm.results = [{ id: '1' }]
      wrapper.vm.onDelete({ target: { value: '' } })
      expect(wrapper.vm.query).toBe('')
      expect(wrapper.vm.results).toEqual([])
    })

    it('calls handleInput when value is not empty', () => {
      wrapper.vm.onDelete({ target: { value: 'abc' } })
      expect(wrapper.vm.query).toBe('abc')
    })
  })

  describe('clear', () => {
    it('resets query and results', () => {
      wrapper = Wrapper()
      wrapper.vm.query = 'test'
      wrapper.vm.results = [{ id: '1' }]
      wrapper.vm.clear()
      expect(wrapper.vm.query).toBe('')
      expect(wrapper.vm.results).toEqual([])
    })
  })

  describe('onBlur', () => {
    beforeEach(() => {
      jest.useFakeTimers()
      wrapper = Wrapper()
    })

    afterEach(() => {
      jest.useRealTimers()
    })

    it('clears query and results after timeout', () => {
      wrapper.vm.query = 'test'
      wrapper.vm.results = [{ id: '1' }]
      wrapper.vm.onBlur()
      expect(wrapper.vm.query).toBe('test')
      jest.advanceTimersByTime(200)
      expect(wrapper.vm.query).toBe('')
      expect(wrapper.vm.results).toEqual([])
    })
  })

  describe('onSelect', () => {
    beforeEach(() => {
      wrapper = Wrapper()
    })

    it('ignores null', () => {
      wrapper.vm.onSelect(null)
      expect(wrapper.emitted('add-chat-room')).toBeFalsy()
    })

    it('ignores string', () => {
      wrapper.vm.onSelect('some string')
      expect(wrapper.emitted('add-chat-room')).toBeFalsy()
    })

    it('ignores items without __typename', () => {
      wrapper.vm.onSelect({ id: '1', name: 'Test' })
      expect(wrapper.emitted('add-chat-room')).toBeFalsy()
    })

    it('emits add-group-chat-room for Group items', async () => {
      wrapper.vm.onSelect({ id: 'g1', name: 'Group', __typename: 'Group' })
      expect(wrapper.emitted('add-group-chat-room')).toBeTruthy()
      expect(wrapper.emitted('add-group-chat-room')[0]).toEqual(['g1'])
    })

    it('emits add-chat-room for User items', () => {
      wrapper.vm.onSelect({
        id: 'u1',
        name: 'User',
        slug: 'user',
        avatar: 'avatar.jpg',
        __typename: 'User',
      })
      expect(wrapper.emitted('add-chat-room')).toBeTruthy()
      expect(wrapper.emitted('add-chat-room')[0]).toEqual([
        { id: 'u1', name: 'User', slug: 'user', avatar: 'avatar.jpg' },
      ])
    })

    it('emits close-user-search after selection', async () => {
      wrapper.vm.onSelect({ id: 'u1', name: 'User', __typename: 'User' })
      await wrapper.vm.$nextTick()
      expect(wrapper.emitted('close-user-search')).toBeTruthy()
    })
  })

  describe('closeSearch', () => {
    it('emits close-user-search', () => {
      wrapper = Wrapper()
      wrapper.vm.closeSearch()
      expect(wrapper.emitted('close-user-search')).toBeTruthy()
    })
  })

  describe('beforeDestroy', () => {
    it('clears blur timeout', () => {
      jest.useFakeTimers()
      wrapper = Wrapper()
      wrapper.vm.onBlur()
      wrapper.destroy()
      jest.advanceTimersByTime(200)
      // No error thrown = timeout was cleared
      jest.useRealTimers()
    })
  })
})
