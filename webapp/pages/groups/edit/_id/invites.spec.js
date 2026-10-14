import { render, screen, fireEvent } from '@testing-library/vue'

import { getBranding, setBranding } from '@ocelot-social/branding'

import invites from './invites.vue'

const localVue = global.localVue

describe('invites.vue', () => {
  let wrapper
  let mocks

  beforeEach(() => {
    mocks = {
      $t: jest.fn((v) => v),
      $apollo: {
        mutate: jest.fn(),
      },
      $policy: { get: (key) => (key === 'inviteLinkLimit' ? 5 : false) },
      $toast: {
        success: jest.fn(),
        error: jest.fn(),
      },
      localVue,
    }
  })

  const Wrapper = ({ visibility = 'public' } = {}) => {
    return render(invites, {
      localVue,
      propsData: {
        group: {
          id: 'group1',
          name: 'Group 1',
          visibility,
          inviteCodes: [
            {
              code: 'INVITE1',
              comment: 'Test invite 1',
              redeemedByCount: 0,
              isValid: true,
            },
            {
              code: 'INVITE2',
              comment: 'Test invite 2',
              redeemedByCount: 1,
              isValid: false,
            },
          ],
        },
      },
      mocks,
      stubs: {
        'client-only': true,
      },
    })
  }

  it('renders', () => {
    wrapper = Wrapper()
    expect(wrapper.container).toMatchSnapshot()
  })

  // #10472: the invite texts name the network as the brand does, not by a separate env variable.
  describe('names the network by the brand', () => {
    let original

    beforeEach(() => {
      original = getBranding()
      setBranding({ ...original, metadata: { ...original.metadata, applicationName: 'Kreis' } })
    })

    afterEach(() => {
      setBranding(original)
    })

    it('in the invite to a group', () => {
      Wrapper()
      expect(mocks.$t).toHaveBeenCalledWith(
        'invite-codes.invite-link-message-group',
        expect.objectContaining({
          groupName: 'Group 1',
          APPLICATION_NAME: 'Kreis',
        }),
      )
    })

    it('in the invite to a hidden group, which does not name it', () => {
      Wrapper({ visibility: 'hidden' })
      expect(mocks.$t).toHaveBeenCalledWith(
        'invite-codes.invite-link-message-hidden-group',
        expect.objectContaining({
          APPLICATION_NAME: 'Kreis',
        }),
      )
    })
  })

  describe('when a new invite code is generated', () => {
    beforeEach(async () => {
      wrapper = Wrapper()
      const createButton = screen.getByLabelText('invite-codes.generate-code')
      await fireEvent.click(createButton)
    })

    it('calls the mutation to generate a new invite code', () => {
      expect(mocks.$apollo.mutate).toHaveBeenCalledWith({
        mutation: expect.anything(),
        update: expect.anything(),
        variables: {
          groupId: 'group1',
          comment: '',
        },
      })
    })

    it('shows a success message', () => {
      expect(mocks.$toast.success).toHaveBeenCalledWith('invite-codes.create-success')
    })
  })
})
