import { render, screen, fireEvent } from '@testing-library/vue'

import CreateInvitation from './CreateInvitation.vue'

const localVue = global.localVue

describe('CreateInvitation.vue', () => {
  let wrapper

  const Wrapper = ({ isDisabled = false, mocks = {} } = {}) => {
    return render(CreateInvitation, {
      localVue,
      propsData: {
        isDisabled,
      },
      mocks: {
        $t: jest.fn((v) => v),
        ...mocks,
      },
    })
  }

  it('renders', () => {
    wrapper = Wrapper({})
    expect(wrapper.container).toMatchSnapshot()
  })

  it('renders with disabled button', () => {
    wrapper = Wrapper({ isDisabled: true })
    expect(wrapper.container).toMatchSnapshot()
  })

  describe('when the form is submitted', () => {
    beforeEach(() => {
      wrapper = Wrapper({})
    })

    it('emits generate-invite-code with empty comment', async () => {
      const button = screen.getByRole('button')
      await fireEvent.click(button)
      expect(wrapper.emitted()['generate-invite-code']).toEqual([['']])
    })

    it('emits generate-invite-code with comment', async () => {
      const button = screen.getByRole('button')
      const input = screen.getByPlaceholderText('invite-codes.comment-placeholder')
      await fireEvent.update(input, 'Test comment')
      await fireEvent.click(button)
      expect(wrapper.emitted()['generate-invite-code']).toEqual([['Test comment']])
    })
  })

  describe('without the user.invite permission', () => {
    it('does not emit and shows a denied-hint toast instead of a silent no-op', async () => {
      const $toast = { error: jest.fn() }
      wrapper = Wrapper({ mocks: { $can: () => false, $toast } })
      await fireEvent.click(screen.getByRole('button'))
      expect(wrapper.emitted()['generate-invite-code']).toBeUndefined()
      expect($toast.error).toHaveBeenCalledWith('permissions.deniedHint')
    })
  })
})
