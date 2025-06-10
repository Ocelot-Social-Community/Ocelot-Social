import { render, screen, fireEvent } from '@testing-library/vue'
import '@testing-library/jest-dom'

import Invitation from './Invitation.vue'

const localVue = global.localVue

Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn(),
  },
})

const mutations = {
  'modal/SET_OPEN': jest.fn().mockResolvedValue(),
}

describe('Invitation.vue', () => {
  let wrapper

  const Wrapper = ({ wasRedeemed = false, withCopymessage = false }) => {
    const propsData = {
      inviteCode: {
        code: 'test-invite-code',
        comment: 'test-comment',
        redeemedByCount: wasRedeemed ? 1 : 0,
      },
      copyMessage: withCopymessage ? 'test-copy-message' : undefined,
    }
    return render(Invitation, {
      localVue,
      propsData,
      mocks: {
        $t: jest.fn((v) => v),
        $toast: {
          success: jest.fn(),
          error: jest.fn(),
        },
      },
      mutations,
    })
  }

  describe('when the invite code was redeemed', () => {
    beforeEach(() => {
      wrapper = Wrapper({ wasRedeemed: true })
    })

    it('renders', () => {
      expect(wrapper.container).toMatchSnapshot()
    })

    it('says how many times the code was redeemed', () => {
      const redeemedCount = screen.getByText('invite-codes.redeemed-count')
      expect(redeemedCount).toBeInTheDocument()
    })
  })

  describe('when the invite code was not redeemed', () => {
    beforeEach(() => {
      wrapper = Wrapper({ wasRedeemed: false })
    })

    it('renders', () => {
      expect(wrapper.container).toMatchSnapshot()
    })

    it('says it was not redeemed', () => {
      const redeemedCount = screen.queryByText('invite-codes.redeemed-count-0')
      expect(redeemedCount).toBeInTheDocument()
    })
  })

  describe('without copy message', () => {
    beforeEach(() => {
      wrapper = Wrapper({ withCopymessage: false })
    })

    it('can copy the link', async () => {
      const clipboardMock = jest.spyOn(navigator.clipboard, 'writeText').mockResolvedValue()
      const copyButton = screen.getByLabelText('invite-codes.copy-code')
      await fireEvent.click(copyButton)
      expect(clipboardMock).toHaveBeenCalledWith(
        'http://localhost/registration?method=invite-code&inviteCode=test-invite-code',
      )
    })
  })

  describe('with copy message', () => {
    beforeEach(() => {
      wrapper = Wrapper({ withCopymessage: true })
    })

    it('can copy the link with message', async () => {
      const clipboardMock = jest.spyOn(navigator.clipboard, 'writeText').mockResolvedValue()
      const copyButton = screen.getByLabelText('invite-codes.copy-code')
      await fireEvent.click(copyButton)
      expect(clipboardMock).toHaveBeenCalledWith(
        'test-copy-message http://localhost/registration?method=invite-code&inviteCode=test-invite-code',
      )
    })
  })

  describe.skip('invalidate button', () => {
    beforeEach(() => {
      wrapper = Wrapper({ wasRedeemed: false })
    })

    it('opens the delete modal', async () => {
      const deleteButton = screen.getByLabelText('invite-codes.invalidate')
      await fireEvent.click(deleteButton)
      expect(mutations['modal/SET_OPEN']).toHaveBeenCalledTimes(1)
    })
  })
})
