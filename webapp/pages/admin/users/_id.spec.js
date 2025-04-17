import { render, fireEvent, screen } from '@testing-library/vue'
import BadgesPage from './_id.vue'

const localVue = global.localVue

const availableBadges = [
  {
    id: 'verification-badge-1',
    icon: 'icon1',
    type: 'verification',
    description: 'description-v-1',
  },
  {
    id: 'verification-badge-2',
    icon: 'icon2',
    type: 'verification',
    description: 'description-v-2',
  },
  {
    id: 'trophy-badge-1',
    icon: 'icon3',
    type: 'trophy',
    description: 'description-t-1',
  },
  {
    id: 'trophy-badge-2',
    icon: 'icon4',
    type: 'trophy',
    description: 'description-t-2',
  },
]

const user = {
  id: 'user1',
  verified: {
    id: 'verification-badge-1',
  },
  badges: [
    {
      id: 'trophy-badge-2',
    },
  ],
}

describe('.vue', () => {
  let wrapper
  let mocks

  beforeEach(() => {
    mocks = {
      $t: jest.fn((v) => v),
      $apollo: {
        User: {
          query: jest.fn(),
        },
        badges: {
          query: jest.fn(),
        },
        mutate: jest.fn(),
      },
      $toast: {
        success: jest.fn(),
        error: jest.fn(),
      },
    }
  })
  const Wrapper = () => {
    return render(BadgesPage, {
      mocks,
      localVue,
      data: () => ({
        user,
        badges: availableBadges,
      }),
    })
  }

  beforeEach(() => {
    wrapper = Wrapper()
  })

  it('renders', () => {
    expect(wrapper.baseElement).toMatchSnapshot()
  })

  describe('after clicking an inactive verification badge', () => {
    let button
    beforeEach(() => {
      button = screen.getByAltText(availableBadges[1].description)
    })

    describe('and successful server response', () => {
      beforeEach(async () => {
        mocks.$apollo.mutate.mockResolvedValue({
          data: {
            setVerificationBadge: {
              id: 'user1',
              verified: {
                id: availableBadges[1].id,
              },
              badges: [],
            },
          },
        })
        await fireEvent.click(button)
      })

      it('calls the mutation', async () => {
        expect(mocks.$apollo.mutate).toHaveBeenCalledWith({
          mutation: expect.anything(),
          variables: {
            badgeId: availableBadges[0].id,
            userId: 'user1',
          },
        })
      })

      it('shows success message', async () => {
        expect(mocks.$toast.success).toHaveBeenCalledWith('admin.badges.setVerification.success')
      })
    })

    describe('and failed server response', () => {
      beforeEach(async () => {
        mocks.$apollo.mutate.mockRejectedValue({ message: 'Ouch!' })
        await fireEvent.click(button)
      })

      it('calls the mutation', async () => {
        expect(mocks.$apollo.mutate).toHaveBeenCalledWith({
          mutation: expect.anything(),
          variables: {
            badgeId: availableBadges[0].id,
            userId: 'user1',
          },
        })
      })

      it('shows error message', async () => {
        expect(mocks.$toast.error).toHaveBeenCalledWith('admin.badges.setVerification.error')
      })
    })

    describe('after clicking an inactive trophy badge', () => {
      let button
      beforeEach(() => {
        button = screen.getByAltText(availableBadges[2].description)
      })

      describe('and successful server response', () => {
        beforeEach(async () => {
          mocks.$apollo.mutate.mockResolvedValue({
            data: {
              setTrophyBadge: {
                id: 'user1',
                verified: null,
                badges: [
                  {
                    id: 'trophy-badge-2',
                  },
                ],
              },
            },
          })
          await fireEvent.click(button)
        })

        it('calls the mutation', async () => {
          expect(mocks.$apollo.mutate).toHaveBeenCalledWith({
            mutation: expect.anything(),
            variables: {
              badgeId: availableBadges[3].id,
              userId: 'user1',
            },
          })
        })

        it('shows success message', async () => {
          expect(mocks.$toast.success).toHaveBeenCalledWith('admin.badges.rewardTrophy.success')
        })
      })

      describe('and failed server response', () => {
        beforeEach(async () => {
          mocks.$apollo.mutate.mockRejectedValue({ message: 'Ouch!' })
          await fireEvent.click(button)
        })

        it('calls the mutation', async () => {
          expect(mocks.$apollo.mutate).toHaveBeenCalledWith({
            mutation: expect.anything(),
            variables: {
              badgeId: availableBadges[3].id,
              userId: 'user1',
            },
          })
        })

        it('shows error message', async () => {
          expect(mocks.$toast.error).toHaveBeenCalledWith('admin.badges.rewardTrophy.error')
        })
      })
    })

    describe('after clicking an active verification badge', () => {
      let button
      beforeEach(() => {
        button = screen.getByAltText(availableBadges[0].description)
      })

      describe('and successful server response', () => {
        beforeEach(async () => {
          mocks.$apollo.mutate.mockResolvedValue({
            data: {
              setVerificationBadge: {
                id: 'user1',
                verified: null,
                badges: [],
              },
            },
          })
          await fireEvent.click(button)
        })

        it('calls the mutation', async () => {
          expect(mocks.$apollo.mutate).toHaveBeenCalledWith({
            mutation: expect.anything(),
            variables: {
              badgeId: availableBadges[0].id,
              userId: 'user1',
            },
          })
        })

        it('shows success message', async () => {
          expect(mocks.$toast.success).toHaveBeenCalledWith('admin.badges.revoke.success')
        })
      })

      describe('and failed server response', () => {
        beforeEach(async () => {
          mocks.$apollo.mutate.mockRejectedValue({ message: 'Ouch!' })
          await fireEvent.click(button)
        })

        it('calls the mutation', async () => {
          expect(mocks.$apollo.mutate).toHaveBeenCalledWith({
            mutation: expect.anything(),
            variables: {
              badgeId: availableBadges[0].id,
              userId: 'user1',
            },
          })
        })

        it('shows error message', async () => {
          expect(mocks.$toast.error).toHaveBeenCalledWith('admin.badges.revoke.error')
        })
      })
    })
  })

  describe('after clicking an active trophy badge', () => {
    let button
    beforeEach(() => {
      button = screen.getByAltText(availableBadges[3].description)
    })

    describe('and successful server response', () => {
      beforeEach(async () => {
        mocks.$apollo.mutate.mockResolvedValue({
          data: {
            setTrophyBadge: {
              id: 'user1',
              verified: null,
              badges: [],
            },
          },
        })
        await fireEvent.click(button)
      })

      it('calls the mutation', async () => {
        expect(mocks.$apollo.mutate).toHaveBeenCalledWith({
          mutation: expect.anything(),
          variables: {
            badgeId: availableBadges[3].id,
            userId: 'user1',
          },
        })
      })

      it('shows success message', async () => {
        expect(mocks.$toast.success).toHaveBeenCalledWith('admin.badges.revoke.success')
      })
    })

    describe('and failed server response', () => {
      beforeEach(async () => {
        mocks.$apollo.mutate.mockRejectedValue({ message: 'Ouch!' })
        await fireEvent.click(button)
      })

      it('calls the mutation', async () => {
        expect(mocks.$apollo.mutate).toHaveBeenCalledWith({
          mutation: expect.anything(),
          variables: {
            badgeId: availableBadges[3].id,
            userId: 'user1',
          },
        })
      })

      it('shows error message', async () => {
        expect(mocks.$toast.error).toHaveBeenCalledWith('admin.badges.revoke.error')
      })
    })
  })
})
