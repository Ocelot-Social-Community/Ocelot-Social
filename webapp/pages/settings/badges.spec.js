import { render, screen, fireEvent } from '@testing-library/vue'
import '@testing-library/jest-dom'
import badges from './badges.vue'

const localVue = global.localVue

describe('badge settings', () => {
  let mocks

  const apolloMutateMock = jest.fn()

  const Wrapper = () => {
    return render(badges, {
      localVue,
      mocks,
    })
  }

  beforeEach(() => {
    mocks = {
      $t: jest.fn((t) => t),
      $toast: {
        success: jest.fn(),
        error: jest.fn(),
      },
      $apollo: {
        mutate: apolloMutateMock,
      },
    }
  })

  describe('without badges', () => {
    beforeEach(() => {
      mocks.$store = {
        getters: {
          'auth/isModerator': () => false,
          'auth/user': {
            id: 'u23',
            badgeVerification: {
              id: 'bv1',
              icon: '/verification/icon',
              description: 'Verification description',
              isDefault: true,
            },
            badgeTrophiesSelected: [],
            badgeTrophiesUnused: [],
          },
        },
      }
    })

    it('renders', () => {
      const wrapper = Wrapper()
      expect(wrapper.container).toMatchSnapshot()
    })
  })

  describe('with badges', () => {
    const badgeTrophiesSelected = [
      {
        id: '1',
        icon: '/path/to/some/icon',
        isDefault: false,
        description: 'Some description',
      },
      {
        id: '2',
        icon: '/path/to/empty/icon',
        isDefault: true,
        description: 'Empty',
      },
      {
        id: '3',
        icon: '/path/to/third/icon',
        isDefault: false,
        description: 'Third description',
      },
    ]

    const badgeTrophiesUnused = [
      {
        id: '4',
        icon: '/path/to/fourth/icon',
        description: 'Fourth description',
      },
      {
        id: '5',
        icon: '/path/to/fifth/icon',
        description: 'Fifth description',
      },
    ]

    let wrapper

    beforeEach(() => {
      mocks.$store = {
        getters: {
          'auth/isModerator': () => false,
          'auth/user': {
            id: 'u23',
            badgeVerification: {
              id: 'bv1',
              icon: '/verification/icon',
              description: 'Verification description',
              isDefault: false,
            },
            badgeTrophiesSelected,
            badgeTrophiesUnused,
          },
        },
      }
      wrapper = Wrapper()
    })

    it('renders', () => {
      expect(wrapper.container).toMatchSnapshot()
    })

    describe('selecting a used badge', () => {
      beforeEach(async () => {
        const badge = screen.getByTitle(badgeTrophiesSelected[0].description)
        await fireEvent.click(badge)
      })

      it('shows remove badge button', () => {
        expect(screen.getByText('settings.badges.remove')).toBeInTheDocument()
      })

      describe('clicking remove badge button', () => {
        const clickButton = async () => {
          const removeButton = screen.getByText('settings.badges.remove')
          await fireEvent.click(removeButton)
        }

        describe('with successful server request', () => {
          beforeEach(() => {
            apolloMutateMock.mockResolvedValue({
              data: {
                setTrophyBadgeSelected: {
                  id: 'u23',
                  badgeTrophiesSelected: [
                    {
                      id: '2',
                      icon: '/path/to/empty/icon',
                      isDefault: true,
                      description: 'Empty',
                    },
                    {
                      id: '2',
                      icon: '/path/to/empty/icon',
                      isDefault: true,
                      description: 'Empty',
                    },
                    {
                      id: '3',
                      icon: '/path/to/third/icon',
                      isDefault: false,
                      description: 'Third description',
                    },
                  ],
                },
              },
            })
            clickButton()
          })

          it('calls the server', () => {
            expect(apolloMutateMock).toHaveBeenCalledWith({
              mutation: expect.anything(),
              update: expect.anything(),
              variables: {
                badgeId: null,
                slot: 0,
              },
            })
          })

          /* To test this, we would need a better apollo mock */
          it.skip('removes the badge', async () => {
            expect(wrapper.container).toMatchSnapshot()
          })

          it('shows a success message', () => {
            expect(mocks.$toast.success).toHaveBeenCalledWith('settings.badges.success-update')
          })
        })

        describe('with failed server request', () => {
          beforeEach(() => {
            apolloMutateMock.mockRejectedValue({ message: 'Ouch!' })
            clickButton()
          })

          it('shows an error message', () => {
            expect(mocks.$toast.error).toHaveBeenCalledWith('settings.badges.error-update')
          })
        })
      })
    })

    describe('no more badges available', () => {
      beforeEach(async () => {
        mocks.$store.getters['auth/user'].badgeTrophiesUnused = []
      })

      describe('selecting an empty slot', () => {
        beforeEach(async () => {
          const emptySlot = screen.getAllByTitle('Empty')[0]
          await fireEvent.click(emptySlot)
        })

        it('shows no more badges available message', () => {
          expect(wrapper.container).toMatchSnapshot()
        })
      })
    })

    describe('more badges available', () => {
      describe('selecting an empty slot', () => {
        beforeEach(async () => {
          const emptySlot = screen.getAllByTitle('Empty')[0]
          await fireEvent.click(emptySlot)
        })

        it('shows list with available badges', () => {
          expect(wrapper.container).toMatchSnapshot()
        })

        describe('clicking on an available badge', () => {
          const clickBadge = async () => {
            const badge = screen.getByText(badgeTrophiesUnused[0].description)
            await fireEvent.click(badge)
          }

          describe('with successful server request', () => {
            beforeEach(() => {
              apolloMutateMock.mockResolvedValue({
                data: {
                  setTrophyBadgeSelected: {
                    id: 'u23',
                    badgeTrophiesSelected: [
                      {
                        id: '4',
                        icon: '/path/to/fourth/icon',
                        description: 'Fourth description',
                        isDefault: false,
                      },
                      {
                        id: '2',
                        icon: '/path/to/empty/icon',
                        isDefault: true,
                        description: 'Empty',
                      },
                      {
                        id: '3',
                        icon: '/path/to/third/icon',
                        isDefault: false,
                        description: 'Third description',
                      },
                    ],
                  },
                },
              })
              clickBadge()
            })

            it('calls the server', () => {
              expect(apolloMutateMock).toHaveBeenCalledWith({
                mutation: expect.anything(),
                update: expect.anything(),
                variables: {
                  badgeId: '4',
                  slot: 1,
                },
              })
            })

            /* To test this, we would need a better apollo mock */
            it.skip('adds the badge', async () => {
              expect(wrapper.container).toMatchSnapshot()
            })

            it('shows a success message', () => {
              expect(mocks.$toast.success).toHaveBeenCalledWith('settings.badges.success-update')
            })
          })

          describe('with failed server request', () => {
            beforeEach(() => {
              apolloMutateMock.mockRejectedValue({ message: 'Ouch!' })
              clickBadge()
            })

            it('shows an error message', () => {
              expect(mocks.$toast.error).toHaveBeenCalledWith('settings.badges.error-update')
            })
          })
        })
      })
    })
  })
})
