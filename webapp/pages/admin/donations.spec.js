import { mount } from '@vue/test-utils'
import Donations from './donations.vue'

const localVue = global.localVue

describe('donations.vue', () => {
  let wrapper
  let mocks

  beforeEach(() => {
    mocks = {
      $t: jest.fn((string) => string),
      $apollo: {
        // queries: {
        //   Donations: {
        //     refetch: jest.fn(),
        //     // fetchMore: jest.fn().mockResolvedValue([
        //     //   {
        //     //     id: 'p23',
        //     //     name: 'It is a post',
        //     //     author: {
        //     //       id: 'u1',
        //     //     },
        //     //   },
        //     // ]),
        //   },
        // },
        query: jest.fn().mockResolvedValue({
          data: {
            Donations: 1,
          },
        }),
        mutate: jest.fn(),
      },
    }
  })

  describe('mount', () => {
    const Wrapper = () => {
      return mount(Donations, {
        mocks,
        localVue,
      })
    }

    beforeEach(() => {
      wrapper = Wrapper()
    })

    it('renders', () => {
      expect(wrapper.is('.base-card')).toBe(true)
    })

    describe('displays', () => {
      it('title', () => {
        expect(wrapper.find('.title').text()).toBe('admin.donations.name')
      })

      it('showDonations label', () => {
        expect(wrapper.find('.show-donations-checkbox').text()).toBe('admin.donations.showDonationsCheckboxLabel')
      })

      it('donations goal label', () => {
        expect(wrapper.find('[data-test="donations-goal"]').text()).toBe('admin.donations.goal')
      })

      it('donations progress label', () => {
        expect(wrapper.find('[data-test="donations-progress"]').text()).toBe('admin.donations.progress')
      })

      it('save button text', () => {
        expect(wrapper.find('.donations-info-button').text()).toBe('actions.save')
      })
    })

    describe('apollo', () => {
      it.only('query is called', () => {
        expect(mocks.$apollo.queries.Donations.refetch).toHaveBeenCalledTimes(1)
      })

      it.skip('query result is displayed', () => {
        mocks.$apollo.queries = jest.fn().mockResolvedValue({
          data: {
            PostsEmotionsCountByEmotion: 1,
          },
        })
      })

      describe('click on save', () => {
        it.skip('entered values are send in the mutation', () => {
          mocks.$apollo.mutate = jest.fn().mockResolvedValue({ data: { shout: 'WeDoShout' } })
        })
      })
    })

    describe('showDonations', () => {
      it.skip('set as default', () => {
      })

      it.skip('click changes value', () => {
      })
    })

    it.skip('XXX', () => {
    })

    it.skip('XXX', () => {
    })

    it.skip('XXX', () => {
    })

    it.skip('XXX', () => {
    })

    it.skip('XXX', () => {
    })
  })
})
