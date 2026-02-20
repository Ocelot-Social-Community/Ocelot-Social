import { render, screen, fireEvent } from '@testing-library/vue'
import '@testing-library/jest-dom'
import Vuex from 'vuex'

import Invitation from './Invitation.vue'

const localVue = global.localVue

Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn(),
  },
})

const mutations = {
  'modal/SET_OPEN': jest.fn(),
}

describe('Invitation.vue', () => {
  let wrapper

  beforeEach(() => {
    mutations['modal/SET_OPEN'].mockClear()
    navigator.clipboard.writeText.mockClear()
  })

  const Wrapper = ({ wasRedeemed = false, withCopymessage = false }) => {
    const store = new Vuex.Store({
      modules: {
        modal: {
          namespaced: true,
          mutations: {
            SET_OPEN: mutations['modal/SET_OPEN'],
          },
        },
      },
    })
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
      store,
      propsData,
      mocks: {
        $t: jest.fn((v) => v),
        $toast: {
          success: jest.fn(),
          error: jest.fn(),
        },
      },
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
      const copyButton = screen.getByLabelText('invite-codes.copy-code')
      await fireEvent.click(copyButton)
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        'http://localhost/registration?method=invite-code&inviteCode=test-invite-code',
      )
    })
  })

  describe('with copy message', () => {
    beforeEach(() => {
      wrapper = Wrapper({ withCopymessage: true })
    })

    it('can copy the link with message', async () => {
      const copyButton = screen.getByLabelText('invite-codes.copy-code')
      await fireEvent.click(copyButton)
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        'test-copy-message http://localhost/registration?method=invite-code&inviteCode=test-invite-code',
      )
    })
  })

  describe('invalidate button', () => {
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
