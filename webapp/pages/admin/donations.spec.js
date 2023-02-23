import { mount } from '@vue/test-utils'
import Vue from 'vue'
import Donations from './donations.vue'

const localVue = global.localVue

describe('donations.vue', () => {
  let wrapper
  let mocks

  const donationsQueryMock = jest.fn()
  const donationsUpdateMock = jest.fn()
  const donationsMutaionMock = jest.fn()
  donationsMutaionMock.mockResolvedValue({
    then: jest.fn(),
    catch: jest.fn(),
  })

  beforeEach(() => {
    mocks = {
      $t: jest.fn((string) => string),
      $apollo: {
        Donations: {
          query: donationsQueryMock,
          update: donationsUpdateMock,
        },
        mutate: donationsMutaionMock,
        queries: {
          Donations: {
            query: donationsQueryMock,
            refetch: jest.fn(),
            fetchMore: jest.fn().mockResolvedValue([
              {
                id: 'p23',
                name: 'It is a post',
                author: {
                  id: 'u1',
                },
              },
            ]),
          },
        },
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
      expect(wrapper.classes('base-card')).toBe(true)
    })

    describe('displays', () => {
      it('title', () => {
        expect(wrapper.find('.title').text()).toBe('admin.donations.name')
      })

      it('showDonations label', () => {
        expect(wrapper.find('.show-donations-checkbox').text()).toBe(
          'admin.donations.showDonationsCheckboxLabel',
        )
      })

      it('donations goal label', () => {
        expect(wrapper.find('[data-test="donations-goal"]').text()).toBe('admin.donations.goal')
      })

      it('donations progress label', () => {
        expect(wrapper.find('[data-test="donations-progress"]').text()).toBe(
          'admin.donations.progress',
        )
      })

      it('save button text', () => {
        expect(wrapper.find('.donations-info-button').text()).toBe('actions.save')
      })
    })

    describe('form component click', () => {
      it('on #showDonations checkbox changes "showDonations" to true', async () => {
        await wrapper.find('#showDonations').setChecked(true)
        expect(wrapper.vm.showDonations).toBe(true)
      })

      it('on #showDonations checkbox twice changes "showDonations" back to false', async () => {
        await wrapper.find('#showDonations').setChecked(true)
        await wrapper.find('#showDonations').setChecked(false)
        expect(wrapper.vm.showDonations).toBe(false)
      })

      it.skip('on donations-goal and enter value XXX', async () => {
        await wrapper.find('#donations-goal').setValue('20000')
        expect(wrapper.vm.formData.goal).toBe('20000')
      })
    })

    describe('apollo', () => {
      it.skip('query is called', () => {
        expect(donationsQueryMock).toHaveBeenCalledTimes(1)
        expect(mocks.$apollo.queries.Donations.refetch).toHaveBeenCalledTimes(1)
        // expect(mocks.$apollo.Donations.query().exists()).toBeTruthy()
        // console.log('mocks.$apollo: ', mocks.$apollo)
      })

      it.skip('query result is displayed', () => {
        mocks.$apollo.queries = jest.fn().mockResolvedValue({
          data: {
            PostsEmotionsCountByEmotion: 1,
          },
        })
      })

      describe('submit', () => {
        beforeEach(() => {
          jest.clearAllMocks()
        })

        it('calls mutation with default values once', () => {
          wrapper.find('.donations-info-button').trigger('submit')
          expect(donationsMutaionMock).toHaveBeenCalledWith(
            expect.objectContaining({
              variables: { showDonations: false, goal: 15000, progress: 0 },
            }),
          )
        })

        it('calls mutation with input values once', async () => {
          wrapper.find('#showDonations').setChecked(true)
          await wrapper.vm.$nextTick()
          wrapper.find('#donations-goal').setValue('20000')
          await wrapper.vm.$nextTick()
          wrapper.find('#donations-progress').setValue('10000')
          await wrapper.vm.$nextTick()
          wrapper.find('.donations-info-button').trigger('submit')
          await wrapper.vm.$nextTick()
          expect(mocks.$apollo.mutate).toHaveBeenCalledWith(
            expect.objectContaining({
              variables: { showDonations: true, goal: 20000, progress: 10000 },
            }),
          )
        })

        it.skip('calls mutation with corrected values once', async () => {
          wrapper.find('.show-donations-checkbox').trigger('click')
          await Vue.nextTick()
          expect(wrapper.vm.showDonations).toBe(false)
          // wrapper.find('.donations-info-button').trigger('submit')
          // await mocks.$apollo.mutate
          // expect(mocks.$apollo.mutate).toHaveBeenCalledWith(expect.objectContaining({variables: { showDonations: false, goal: 15000, progress: 7000 }}))
          // expect(mocks.$apollo.mutate).toHaveBeenCalledTimes(1)
        })

        it.skip('default values are displayed', async () => {
          mocks.$apollo.mutate = jest.fn().mockResolvedValue({
            data: { UpdateDonations: { showDonations: true, goal: 10, progress: 20 } },
          })
          wrapper.find('.donations-info-button').trigger('submit')
          await mocks.$apollo.mutate
          await Vue.nextTick()
          expect(wrapper.vm.showDonations).toBe(false)
          expect(wrapper.vm.formData.goal).toBe(1)
          expect(wrapper.vm.formData.progress).toBe(1)
        })

        it.skip('entered values are send in the mutation', async () => {
          // mocks.$apollo.mutate = jest.fn().mockResolvedValue({ data: { UpdateDonations: { showDonations: true, goal: 10, progress: 20 } } })

          // expect(wrapper.vm.showDonations).toBe(null)
          // expect(wrapper.vm.formData.goal).toBe(null)
          // expect(wrapper.vm.formData.progress).toBe(null)
          // wrapper.find('.base-button').trigger('click')
          // await Vue.nextTick()
          // expect(wrapper.vm.showDonations).toBe(true)
          // expect(wrapper.vm.formData.goal).toBe(1)
          // expect(wrapper.vm.formData.progress).toBe(1)

          // wrapper.find('.base-button').trigger('click')
          // wrapper.find('.donations-info-button').trigger('click')
          // await Vue.nextTick()
          // wrapper.find('.donations-info-button').trigger('submit')
          await mocks.$apollo.mutate
          expect(mocks.$apollo.mutate).toHaveBeenCalledTimes(1)
        })
      })
    })
  })
})
