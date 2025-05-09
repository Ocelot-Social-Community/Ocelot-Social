import { render, screen, fireEvent } from '@testing-library/vue'
import '@testing-library/jest-dom'

import InvitationList from './InvitationList.vue'

const localVue = global.localVue

Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn(),
  },
})

const sampleInviteCodes = [
  {
    code: 'test-invite-code-1',
    comment: 'test-comment',
    redeemedByCount: 0,
    isValid: true,
  },
  {
    code: 'test-invite-code-2',
    comment: 'test-comment-2',
    redeemedByCount: 1,
    isValid: true,
  },
  {
    code: 'test-invite-code-3',
    comment: 'test-comment-3',
    redeemedByCount: 0,
    isValid: false,
  },
]

describe('InvitationList.vue', () => {
  let wrapper

  const Wrapper = ({ withInviteCodes, withCopymessage = false, limit = 3 }) => {
    const propsData = {
      inviteCodes: withInviteCodes ? sampleInviteCodes : [],
      copyMessage: withCopymessage ? 'test-copy-message' : undefined,
    }
    return render(InvitationList, {
      localVue,
      propsData,
      mocks: {
        $t: jest.fn((v) => v),
        $toast: {
          success: jest.fn(),
          error: jest.fn(),
        },
        $env: {
          INVITE_LINK_LIMIT: limit,
        },
      },
      stubs: {
        'client-only': true,
      },
    })
  }

  it('renders', () => {
    wrapper = Wrapper({ withInviteCodes: true })
    expect(wrapper.container).toMatchSnapshot()
  })

  it('renders empty state', () => {
    wrapper = Wrapper({ withInviteCodes: false })
    expect(wrapper.container).toMatchSnapshot()
  })

  it('does not render invalid invite codes', () => {
    wrapper = Wrapper({ withInviteCodes: true })
    const invalidInviteCode = screen.queryByText('invite-codes.test-invite-code-3')
    expect(invalidInviteCode).not.toBeInTheDocument()
  })

  describe('without copy message', () => {
    beforeEach(() => {
      wrapper = Wrapper({ withCopymessage: false, withInviteCodes: true })
    })

    it('can copy a link', async () => {
      const clipboardMock = jest.spyOn(navigator.clipboard, 'writeText').mockResolvedValue()
      const copyButton = screen.getAllByLabelText('invite-codes.copy-code')[0]
      await fireEvent.click(copyButton)
      expect(clipboardMock).toHaveBeenCalledWith(
        'http://localhost/registration?method=invite-code&inviteCode=test-invite-code-1',
      )
    })
  })

  describe('with copy message', () => {
    beforeEach(() => {
      wrapper = Wrapper({ withCopymessage: true, withInviteCodes: true })
    })

    it('can copy the link with message', async () => {
      const clipboardMock = jest.spyOn(navigator.clipboard, 'writeText').mockResolvedValue()
      const copyButton = screen.getAllByLabelText('invite-codes.copy-code')[0]
      await fireEvent.click(copyButton)
      expect(clipboardMock).toHaveBeenCalledWith(
        'test-copy-message http://localhost/registration?method=invite-code&inviteCode=test-invite-code-1',
      )
    })
  })

  it('cannot generate more than the limit of invite codes', () => {
    wrapper = Wrapper({ withInviteCodes: true, limit: 3 })
    const generateButton = screen.getByText('invite-codes.generate-invite-code')
    expect(generateButton).toBeDisabled()
  })
})
