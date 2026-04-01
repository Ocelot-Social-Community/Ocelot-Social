import { render, screen, fireEvent } from '@testing-library/vue'
import '@testing-library/jest-dom'

import InviteCodeList from './InviteCodeList.vue'

const localVue = global.localVue

Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn(),
  },
})

const sampleInviteCodes = [
  {
    code: 'ACTIVE1',
    comment: 'For Alice',
    redeemedByCount: 2,
    isValid: true,
    redeemedBy: [
      { id: 'u10', name: 'Alice', slug: 'alice', avatar: null },
      { id: 'u11', name: 'Bob', slug: 'bob', avatar: null },
    ],
  },
  {
    code: 'ACTIVE2',
    comment: null,
    redeemedByCount: 0,
    isValid: true,
    redeemedBy: [],
  },
  {
    code: 'EXPIRED1',
    comment: 'Old link',
    redeemedByCount: 1,
    isValid: false,
    redeemedBy: [{ id: 'u12', name: 'Charlie', slug: 'charlie', avatar: null }],
  },
]

const defaultMocks = {
  $t: jest.fn((key, params) => {
    if (params) return `${key}:${JSON.stringify(params)}`
    return key
  }),
  $toast: { success: jest.fn(), error: jest.fn() },
  $env: { INVITE_LINK_LIMIT: 7 },
  $apollo: {
    mutate: jest.fn().mockResolvedValue({}),
  },
  $store: {
    getters: { 'auth/user': { inviteCodes: sampleInviteCodes } },
    commit: jest.fn(),
  },
}

const Wrapper = (propsOverrides = {}, mocksOverrides = {}) => {
  return render(InviteCodeList, {
    localVue,
    propsData: {
      inviteCodes: sampleInviteCodes,
      copyMessage: 'Join us!',
      ...propsOverrides,
    },
    mocks: { ...defaultMocks, ...mocksOverrides },
    stubs: {
      'client-only': true,
      'profile-list': true,
      'confirm-modal': true,
    },
  })
}

describe('InviteCodeList.vue', () => {
  describe('title with count', () => {
    it('shows title with active/max count', () => {
      Wrapper()
      expect(screen.getByText('invite-codes.my-invite-links')).toBeInTheDocument()
      expect(screen.getByText('(2/7)')).toBeInTheDocument()
    })
  })

  describe('without showInvitedUsers (popup mode)', () => {
    it('shows invited-count summary text', () => {
      Wrapper()
      expect(
        screen.getByText('invite-codes.invited-count:{"count":3}'),
      ).toBeInTheDocument()
    })

    it('does not show invited-count when no one invited', () => {
      Wrapper({ inviteCodes: [sampleInviteCodes[1]] })
      expect(screen.queryByText(/invite-codes.invited-count/)).not.toBeInTheDocument()
    })

    it('does not show expired codes section', () => {
      Wrapper()
      expect(screen.queryByText(/settings.invites.expired-codes/)).not.toBeInTheDocument()
    })

    it('does not show profile-list', () => {
      Wrapper()
      expect(screen.queryByText(/settings.invites.invited-users/)).not.toBeInTheDocument()
    })
  })

  describe('with showInvitedUsers (settings mode)', () => {
    it('does not show invited-count summary', () => {
      Wrapper({ showInvitedUsers: true })
      expect(screen.queryByText(/invite-codes.invited-count/)).not.toBeInTheDocument()
    })

    it('shows expired codes toggle', () => {
      Wrapper({ showInvitedUsers: true })
      expect(
        screen.getByText('settings.invites.expired-codes:{"count":1}'),
      ).toBeInTheDocument()
    })

    it('expired codes list is hidden by default', () => {
      Wrapper({ showInvitedUsers: true })
      expect(screen.queryByText('EXPIRED1')).not.toBeInTheDocument()
    })

    it('shows expired codes after clicking toggle', async () => {
      Wrapper({ showInvitedUsers: true })
      const toggle = screen.getByText('settings.invites.expired-codes:{"count":1}')
      await fireEvent.click(toggle)
      expect(screen.getByText('EXPIRED1')).toBeInTheDocument()
      expect(screen.getByText('— Old link')).toBeInTheDocument()
    })

    it('does not show expired section when no expired codes', () => {
      Wrapper({
        showInvitedUsers: true,
        inviteCodes: sampleInviteCodes.filter((c) => c.isValid),
      })
      expect(screen.queryByText(/settings.invites.expired-codes/)).not.toBeInTheDocument()
    })
  })
})
