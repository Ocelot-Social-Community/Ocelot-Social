import { mount } from '@vue/test-utils'
import HashtagsFilter from './HashtagsFilter.vue'

const localVue = global.localVue

describe('HashtagsFilter.vue', () => {
  let wrapper
  let mocks
  let propsData

  beforeEach(() => {
    mocks = { $t: () => {} }
  })

  describe('given a hashtag', () => {
    beforeEach(() => {
      propsData = {
        hashtag: 'Frieden',
      }
    })

    describe('mount', () => {
      const Wrapper = () => {
        return mount(HashtagsFilter, { mocks, localVue, propsData })
      }
      beforeEach(() => {
        wrapper = Wrapper()
      })

      it('renders a card', () => {
        expect(wrapper.classes('os-card')).toBe(true)
      })

      describe('click clear search button', () => {
        it('emits clearSearch', () => {
          wrapper.find('button[data-test="clear-search-button"]').trigger('click')
          expect(wrapper.emitted().clearSearch).toHaveLength(1)
        })
      })
    })
  })
})
