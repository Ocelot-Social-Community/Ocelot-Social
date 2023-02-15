import { mount } from '@vue/test-utils'
import TabNavigation from './TabNavigation'

const localVue = global.localVue

const stubs = {
  'client-only': true,
}

describe('TabNavigation', () => {
  let mocks, propsData, wrapper
  const Wrapper = () => {
    return mount(TabNavigation, { mocks, localVue, propsData, stubs })
  }

  beforeEach(() => {
    mocks = {
      $t: jest.fn(),
    }
    propsData = {
      tabs: [
        {
          type: 'Post',
          title: 'Posts',
          count: 12,
          disabled: false,
        },
        {
          type: 'User',
          title: 'Users',
          count: 9,
          disabled: false,
        },
        {
          type: 'Hashtag',
          title: 'Hashtags',
          count: 0,
          disabled: true,
        },
      ],
      activeTab: 'Post',
    }
    wrapper = Wrapper()
  })

  describe('mount', () => {
    it('renders tab-navigation component', () => {
      expect(wrapper.find('.tab-navigation').exists()).toBe(true)
    })

    describe('displays', () => {
      // we couldn't get it running with "jest.runAllTimers()" and so we used "setTimeout"
      // time is a bit more then 3000 milisec see "webapp/components/CountTo.vue"
      const counterTimeout = 3000 + 10

      it('shows a total of 17 results', () => {
        setTimeout(() => {
          expect(wrapper.find('.total-search-results').text()).toContain('17')
        }, counterTimeout)
      })

      it('shows tab with 12 posts', () => {
        setTimeout(() => {
          expect(wrapper.find('[data-test="Post-tab"]').text()).toContain('12')
        }, counterTimeout)
      })

      it('shows tab with 9 users', () => {
        setTimeout(() => {
          expect(wrapper.find('[data-test="User-tab"]').text()).toContain('9')
        }, counterTimeout)
      })

      it('shows tab with 0 hashtags', () => {
        setTimeout(() => {
          expect(wrapper.find('[data-test="Hashtag-tab"]').text()).toContain('0')
        }, counterTimeout)
      })

      describe('basic props setting', () => {
        it('has post tab as active tab', () => {
          expect(wrapper.find('[data-test="Post-tab"]').classes('--active')).toBe(true)
        })

        it('has user tab inactive', () => {
          expect(wrapper.find('[data-test="User-tab"]').classes('--active')).toBe(false)
        })

        it('has hashtag tab disabled', () => {
          expect(wrapper.find('[data-test="Hashtag-tab"]').classes('--disabled')).toBe(true)
        })
      })
    })

    describe('interactions', () => {
      it('emits "switch-tab" with "User" after clicking on user tab', () => {
        wrapper.find('[data-test="User-tab-click"]').trigger('click')
        expect(wrapper.emitted('switch-tab')).toEqual([['User']])
      })

      it('emits no "switch-tab" after clicking on inactiv hashtag tab', () => {
        wrapper.find('[data-test="Hashtag-tab-click"]').trigger('click')
        expect(wrapper.emitted('switch-tab')).toBeFalsy()
      })
    })
  })
})
