import { mount } from '@vue/test-utils'
import Invites from './invites.vue'

const localVue = global.localVue

describe('invites.vue', () => {
  let wrapper

  const sampleUser = {
    inviteCodes: [
      { code: 'ABC', comment: null, redeemedByCount: 0, isValid: true, redeemedBy: [] },
    ],
  }

  const Wrapper = () => {
    return mount(Invites, {
      localVue,
      mocks: {
        $t: jest.fn((key) => key),
        $toast: { success: jest.fn(), error: jest.fn() },
        $env: { INVITE_LINK_LIMIT: 7, NETWORK_NAME: 'TestNetwork' },
        $apollo: { mutate: jest.fn().mockResolvedValue({}) },
        $store: {
          getters: { 'auth/user': sampleUser },
          commit: jest.fn(),
        },
      },
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
      expect(inviteCodeList.exists()).toBe(true)
    })
  })
})
