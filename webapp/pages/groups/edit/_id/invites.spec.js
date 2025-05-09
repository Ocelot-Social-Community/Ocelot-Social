import { render, screen, fireEvent } from '@testing-library/vue'

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
      $env: {
        NETWORK_NAME: 'test-network',
        INVITE_LINK_LIMIT: 5,
      },
      $toast: {
        success: jest.fn(),
        error: jest.fn(),
      },
      localVue,
    }
  })

  const Wrapper = () => {
    return render(invites, {
      localVue,
      propsData: {
        group: {
          id: 'group1',
          name: 'Group 1',
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
