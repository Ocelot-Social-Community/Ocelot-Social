import { mount } from '@vue/test-utils'
import Donations from './donations.vue'

const localVue = global.localVue

describe('donations.vue', () => {
  let wrapper
  let mocks

  const donationsQueryMock = jest.fn()
  const donationsUpdateMock = jest.fn()
  const donationsMutationMock = jest.fn().mockResolvedValue({})

  beforeEach(() => {
    mocks = {
      $t: jest.fn((string) => string),
      $toast: {
        success: jest.fn(),
        error: jest.fn(),
      },
      $apollo: {
        Donations: {
          query: donationsQueryMock,
          update: donationsUpdateMock,
        },
        mutate: donationsMutationMock,
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
      expect(wrapper.classes('os-card')).toBe(true)
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

      it('donations-goal input exists and accepts input', async () => {
        const goalInput = wrapper.find('#donations-goal')
        expect(goalInput.exists()).toBe(true)
        await goalInput.setValue('42000')
        expect(goalInput.element.value).toBe('42000')
      })
    })

    describe('apollo', () => {
      it('query is defined and returns a GraphQL document', () => {
        const apolloOption = wrapper.vm.$options.apollo.Donations
        expect(apolloOption.query).toBeInstanceOf(Function)
        const query = apolloOption.query.call(wrapper.vm)
        expect(query).toBeDefined()
        expect(query.kind).toBe('Document')
      })

      it('query result is displayed', async () => {
        const updateFn = wrapper.vm.$options.apollo.Donations.update.bind(wrapper.vm)
        updateFn({ Donations: { showDonations: true, goal: 25000, progress: 8000 } })
        await wrapper.vm.$nextTick()
        expect(wrapper.vm.showDonations).toBe(true)
        expect(wrapper.vm.formData).toEqual({ goal: '25000', progress: '8000' })
      })

      describe('submit', () => {
        beforeEach(() => {
          jest.clearAllMocks()
        })

        it('calls mutation with default values once', async () => {
          await wrapper.find('.donations-info-button').trigger('submit')
          expect(donationsMutationMock).toHaveBeenCalledWith(
            expect.objectContaining({
              variables: { showDonations: false, goal: 15000, progress: 0 },
            }),
          )
        })

        it('calls mutation with input values once', async () => {
          await wrapper.find('#showDonations').setChecked(true)
          await wrapper.find('#donations-goal').setValue('20000')
          await wrapper.find('#donations-progress').setValue('10000')
          await wrapper.find('.donations-info-button').trigger('submit')
          expect(donationsMutationMock).toHaveBeenCalledWith(
            expect.objectContaining({
              variables: { showDonations: true, goal: 20000, progress: 10000 },
            }),
          )
        })

        it('calls mutation with corrected values once', async () => {
          await wrapper.find('#showDonations').setChecked(true)
          await wrapper.find('#donations-goal').setValue('10000')
          await wrapper.find('#donations-progress').setValue('15000')
          await wrapper.find('.donations-info-button').trigger('submit')
          expect(donationsMutationMock).toHaveBeenCalledWith(
            expect.objectContaining({
              variables: { showDonations: true, goal: 10000, progress: 10000 },
            }),
          )
        })

        it('default values are displayed after mutation', async () => {
          await wrapper.find('.donations-info-button').trigger('submit')
          const { update } = donationsMutationMock.mock.calls[0][0]
          update(null, {
            data: { UpdateDonations: { showDonations: true, goal: 15000, progress: 0 } },
          })
          expect(wrapper.vm.showDonations).toBe(true)
          expect(wrapper.vm.formData).toEqual({ goal: '15000', progress: '0' })
        })
      })
    })
  })
})
