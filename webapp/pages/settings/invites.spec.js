import { mount } from '@vue/test-utils'
import { getBranding, setBranding } from '@ocelot-social/branding'
import Invites from './invites.vue'

const localVue = global.localVue

describe('invites.vue', () => {
  let wrapper
  let mocks

  const sampleUser = {
    inviteCodes: [
      { code: 'ABC', comment: null, redeemedByCount: 0, isValid: true, redeemedBy: [] },
    ],
  }

  const Wrapper = () => {
    return mount(Invites, {
      localVue,
      mocks: (mocks = {
        $t: jest.fn((key) => key),
        $toast: { success: jest.fn(), error: jest.fn() },
        $policy: { get: (key) => (key === 'inviteLinkLimit' ? 7 : false) },
        $apollo: { mutate: jest.fn().mockResolvedValue({}) },
        $store: {
          getters: { 'auth/user': sampleUser },
          commit: jest.fn(),
        },
      }),
      computed: {
        user: () => sampleUser,
      },
      stubs: {
        'invite-code-list': true,
      },
    })
  }

  describe('mount', () => {
    beforeEach(() => {
      wrapper = Wrapper()
    })

    it('renders', () => {
      expect(wrapper.classes('os-card')).toBe(true)
    })

    it('passes showInvitedUsers to InviteCodeList', () => {
      const inviteCodeList = wrapper.find('invite-code-list-stub')
      expect(inviteCodeList.attributes('showinvitedusers')).toBe('true')
    })

    it('passes inviteCodes to InviteCodeList', () => {
      const inviteCodeList = wrapper.find('invite-code-list-stub')
      expect(inviteCodeList.attributes('invitecodes')).toBeDefined()
    })
  })

  // #10472: the invite text names the network as the brand does, not by a separate env variable.
  it('names the network by the brand in the invite text', () => {
    const original = getBranding()
    setBranding({ ...original, metadata: { ...original.metadata, applicationName: 'Kreis' } })
    try {
      Wrapper()
      expect(mocks.$t).toHaveBeenCalledWith(
        'invite-codes.invite-link-message-personal',
        expect.objectContaining({
          APPLICATION_NAME: 'Kreis',
        }),
      )
    } finally {
      setBranding(original)
    }
  })
})
