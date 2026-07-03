import GroupProfileSlug from './_slug.vue'
import { render, screen, fireEvent } from '@testing-library/vue'
import { mount } from '@vue/test-utils'
import Vue from 'vue'
import Vuex from 'vuex'

const localVue = global.localVue

localVue.filter('date', (d) => d)

const stubs = {
  'client-only': true,
  'v-popover': true,
  'nuxt-link': true,
  'router-link': true,
  // 'infinite-loading': true,
  'follow-list': true,
}

// Mock Math.random, used in Dropdown
Object.assign(Math, {
  random: () => 0,
})

jest.mock('vue-infinite-loading', () => ({}))

describe('GroupProfileSlug', () => {
  let wrapper
  let mocks
  let yogaPractice
  let schoolForCitizens
  let investigativeJournalism
  let peterLustig
  let jennyRostock
  let bobDerBaumeister
  let huey

  const currentUserMock = jest.fn()

  const getters = {
    'auth/user': currentUserMock,
    'auth/isModerator': () => false,
    'categories/categories': () => [{ id: 'cat1' }],
    'videoCall/enabled': () => false,
  }

  const actions = {
    'categories/init': jest.fn(),
  }

  const mutations = {
    'chat/SET_OPEN_CHAT': jest.fn(),
    'videoCall/OPEN': jest.fn(),
  }

  const store = new Vuex.Store({
    getters,
    actions,
    mutations,
  })

  beforeEach(() => {
    mocks = {
      // post: {
      //   id: 'p23',
      //   name: 'It is a post',
      // },
      // categories feature enabled — read via $policy by getCategoriesMixin.
      // Key-specific so a wrong/typo'd policy key in the code resolves to false
      // (off) and the test catches it, rather than passing on a blanket `true`.
      $policy: { get: (key) => key === 'categoriesActive' },
      $t: jest.fn((a) => a),
      $filters: {
        removeLinks: (c) => c,
        truncate: (a) => a,
      },
      // If you're mocking router, then don't use VueRouter with localVue: https://vue-test-utils.vuejs.org/guides/using-with-vue-router.html
      $route: {
        params: {
          id: 'g1',
          slug: 'school-for-citizens',
        },
      },
      $router: {
        history: {
          push: jest.fn(),
        },
      },
      $toast: {
        success: jest.fn(),
        error: jest.fn(),
      },
      $apollo: {
        loading: false,
        mutate: jest.fn().mockResolvedValue(),
        subscribe: jest.fn().mockReturnValue({
          subscribe: jest.fn().mockReturnValue({ unsubscribe: jest.fn() }),
        }),
      },
    }
    yogaPractice = {
      id: 'g2',
      name: 'Yoga Practice',
      slug: 'yoga-practice',
      about: null,
      description: `<h3>What Is yoga?</h3><p>Yoga is not just about practicing asanas. It's about how we do it.</p><p class="">And practicing asanas doesn't have to be yoga, it can be more athletic than yogic.</p><h3>What makes practicing asanas yogic?</h3><p class="">The important thing is:</p><ul><li><p>Use the exercises (consciously) for your personal development.</p></li></ul>`,
      descriptionExcerpt: `<h3>What Is yoga?</h3><p>Yoga is not just about practicing asanas. It's about how we do it.</p><p>And practicing asanas doesn't have to be yoga, it can be more athletic than yogic.</p><h3>What makes practicing asanas yogic?</h3><p>The important thing is:</p><ul><li><p>Use the exercises …</p></li></ul>`,
      groupType: 'public',
      actionRadius: 'interplanetary',
      categories: [
        {
          id: 'cat4',
          icon: 'psyche',
          name: 'psyche',
          slug: 'psyche',
          description: 'Seele, Gefühle, Glück',
        },
        {
          id: 'cat5',
          icon: 'movement',
          name: 'body-and-excercise',
          slug: 'body-and-excercise',
          description: 'Sport, Yoga, Massage, Tanzen, Entspannung',
        },
        {
          id: 'cat17',
          icon: 'spirituality',
          name: 'spirituality',
          slug: 'spirituality',
          description: 'Religion, Werte, Ethik',
        },
      ],
      locationName: null,
      location: null,
      isMutedByMe: false,
      membersCount: 4,
      // myRole: 'usual',
    }
    schoolForCitizens = {
      id: 'g1',
      name: 'School For Citizens',
      slug: 'school-for-citizens',
      about: 'Our children shall receive education for life.',
      description: `<p class=""><em>English</em></p><h3>Our goal</h3><p>Only those who enjoy learning and do not lose their curiosity can obtain a good education for life and continue to learn with joy throughout their lives.</p><h3>Curiosity</h3><p>For this we need a school that takes up the curiosity of the children, the people, and satisfies it through a lot of experience.</p><p><br></p><p><em>Deutsch</em></p><h3>Unser Ziel</h3><p class="">Nur wer Spaß am Lernen hat und seine Neugier nicht verliert, kann gute Bildung für's Leben erlangen und sein ganzes Leben mit Freude weiter lernen.</p><h3>Neugier</h3><p class="">Dazu benötigen wir eine Schule, die die Neugier der Kinder, der Menschen, aufnimmt und durch viel Erfahrung befriedigt.</p>`,
      descriptionExcerpt: `<p><em>English</em></p><h3>Our goal</h3><p>Only those who enjoy learning and do not lose their curiosity can obtain a good education for life and continue to learn with joy throughout their lives.</p><h3>Curiosity</h3><p>For this we need a school that takes up the curiosity of the children, …</p>`,
      groupType: 'closed',
      actionRadius: 'national',
      categories: [
        {
          id: 'cat8',
          icon: 'child',
          name: 'children',
          slug: 'children',
          description: 'Familie, Pädagogik, Schule, Prägung',
        },
        {
          id: 'cat14',
          icon: 'science',
          name: 'science',
          slug: 'science',
          description: 'Bildung, Hochschule, Publikationen, ...',
        },
      ],
      locationName: 'France',
      location: {
        name: 'Paris',
      },
      isMutedByMe: true,
      membersCount: 0,
      // myRole: 'usual',
    }
    investigativeJournalism = {
      id: 'g0',
      name: 'Investigative Journalism',
      slug: 'investigative-journalism',
      about: 'Investigative journalists share ideas and insights and can collaborate.',
      description: `<p class=""><em>English:</em></p><p class="">This group is hidden.</p><h3>What is our group for?</h3><p>This group was created to allow investigative journalists to share and collaborate.</p><h3>How does it work?</h3><p>Here you can internally share posts and comments about them.</p><p><br></p><p><em>Deutsch:</em></p><p class="">Diese Gruppe ist verborgen.</p><h3>Wofür ist unsere Gruppe?</h3><p class="">Diese Gruppe wurde geschaffen, um investigativen Journalisten den Austausch und die Zusammenarbeit zu ermöglichen.</p><h3>Wie funktioniert das?</h3><p class="">Hier könnt ihr euch intern über Beiträge und Kommentare zu ihnen austauschen.</p>`,
      descriptionExcerpt:
        '<p><em>English:</em></p><p>This group is hidden.</p><h3>What is our group for?</h3><p>This group was created to allow investigative journalists to share and collaborate.</p><h3>How does it work?</h3><p>Here you can internally share posts and comments about them.</p><p><br/></p><p><em>Deutsch:</em></p><p>Diese Gruppe ist verborgen.</p><h3>…</h3>',
      groupType: 'hidden',
      actionRadius: 'global',
      categories: [
        {
          id: 'cat6',
          icon: 'balance-scale',
          name: 'law',
          slug: 'law',
          description: 'Menschenrechte, Gesetze, Verordnungen',
        },
        {
          id: 'cat12',
          icon: 'politics',
          name: 'politics',
          slug: 'politics',
          description: 'Demokratie, Mitbestimmung, Wahlen, Korruption, Parteien',
        },
        {
          id: 'cat16',
          icon: 'media',
          name: 'it-and-media',
          slug: 'it-and-media',
          description:
            'Nachrichten, Manipulation, Datenschutz, Überwachung, Datenkraken, AI, Software, Apps',
        },
      ],
      locationName: 'Hamburg, Germany',
      location: {
        name: 'Hamburg',
      },
      isMutedByMe: false,
      membersCount: 0,
      // myRole: 'usual',
    }
    peterLustig = {
      id: 'u1',
      name: 'Peter Lustig',
      slug: 'peter-lustig',
      role: 'user',
    }
    jennyRostock = {
      id: 'u3',
      name: 'Jenny Rostock',
      slug: 'jenny-rostock',
      role: 'user',
    }
    bobDerBaumeister = {
      id: 'u2',
      name: 'Bob der Baumeister',
      slug: 'bob-der-baumeister',
      role: 'user',
    }
    huey = {
      id: 'u4',
      name: 'Huey',
      slug: 'huey',
      role: 'user',
    }
  })

  const Wrapper = (data = () => {}) => {
    return render(GroupProfileSlug, {
      mocks,
      localVue,
      data,
      stubs,
      store,
    })
  }

  describe('given a puplic group – "yoga-practice"', () => {
    describe('given a current user', () => {
      describe('as group owner – "peter-lustig"', () => {
        beforeEach(() => {
          currentUserMock.mockReturnValue(peterLustig)
          wrapper = Wrapper(() => {
            return {
              group: {
                ...yogaPractice,
                myRole: 'owner',
              },
              GroupMembers: [
                { user: peterLustig, membership: { role: 'owner' } },
                { user: jennyRostock, membership: { role: 'usual' } },
                { user: bobDerBaumeister, membership: { role: 'usual' } },
                { user: huey, membership: { role: 'usual' } },
              ],
            }
          })
        })

        it('renders', () => {
          expect(wrapper.container).toMatchSnapshot()
        })

        describe('after "show more" click displays full description', () => {
          beforeEach(async () => {
            const button = screen.getByText('comment.show.more')
            await fireEvent.click(button)
            // await wrapper.container.vm.$nextTick()
          })

          it('has full description', () => {
            // test if end of full description is visible
            expect(
              screen.queryByText('Use the exercises (consciously) for your personal development.'),
            ).not.toBeNull()
          })

          it('has "show less" button', () => {
            expect(screen.queryByText('comment.show.less')).not.toBeNull()
          })
        })
      })

      describe('as usual member – "jenny-rostock"', () => {
        beforeEach(() => {
          currentUserMock.mockReturnValue(jennyRostock)
          wrapper = Wrapper(() => {
            return {
              group: {
                ...yogaPractice,
                myRole: 'usual',
              },
              GroupMembers: [
                { user: peterLustig, membership: { role: 'owner' } },
                { user: jennyRostock, membership: { role: 'usual' } },
                { user: bobDerBaumeister, membership: { role: 'usual' } },
                { user: huey, membership: { role: 'usual' } },
              ],
            }
          })
        })

        it('renders', () => {
          expect(wrapper.container).toMatchSnapshot()
        })
      })

      describe('as pending member – "bob-der-baumeister"', () => {
        beforeEach(() => {
          currentUserMock.mockReturnValue(bobDerBaumeister)
          wrapper = Wrapper(() => {
            return {
              group: {
                ...yogaPractice,
                myRole: 'pending',
              },
              GroupMembers: [
                { user: peterLustig, membership: { role: 'owner' } },
                { user: jennyRostock, membership: { role: 'usual' } },
                { user: bobDerBaumeister, membership: { role: 'usual' } },
                { user: huey, membership: { role: 'usual' } },
              ],
            }
          })
        })

        it('renders', () => {
          expect(wrapper.container).toMatchSnapshot()
        })
      })

      describe('as none(!) member – "huey"', () => {
        beforeEach(() => {
          currentUserMock.mockReturnValue(huey)
          wrapper = Wrapper(() => {
            return {
              group: {
                ...yogaPractice,
                myRole: null,
              },
              GroupMembers: [
                { user: peterLustig, membership: { role: 'owner' } },
                { user: jennyRostock, membership: { role: 'usual' } },
                { user: bobDerBaumeister, membership: { role: 'usual' } },
                { user: huey, membership: { role: 'usual' } },
              ],
            }
          })
        })

        it('renders', () => {
          expect(wrapper.container).toMatchSnapshot()
        })
      })
    })

    describe('given a closed group – "school-for-citizens"', () => {
      describe('given a current user', () => {
        describe('as group owner – "peter-lustig"', () => {
          beforeEach(() => {
            currentUserMock.mockReturnValue(peterLustig)
            wrapper = Wrapper(() => {
              return {
                group: {
                  ...schoolForCitizens,
                  myRole: 'owner',
                },
                GroupMembers: [
                  { user: peterLustig, membership: { role: 'owner' } },
                  { user: jennyRostock, membership: { role: 'usual' } },
                  { user: bobDerBaumeister, membership: { role: 'usual' } },
                  { user: huey, membership: { role: 'usual' } },
                ],
              }
            })
          })

          it('renders', () => {
            expect(wrapper.container).toMatchSnapshot()
          })
        })

        describe('as usual member – "jenny-rostock"', () => {
          beforeEach(() => {
            currentUserMock.mockReturnValue(jennyRostock)
            wrapper = Wrapper(() => {
              return {
                group: {
                  ...schoolForCitizens,
                  myRole: 'usual',
                },
                GroupMembers: [
                  { user: peterLustig, membership: { role: 'owner' } },
                  { user: jennyRostock, membership: { role: 'usual' } },
                  { user: bobDerBaumeister, membership: { role: 'usual' } },
                  { user: huey, membership: { role: 'usual' } },
                ],
              }
            })
          })

          it('renders', () => {
            expect(wrapper.container).toMatchSnapshot()
          })

          describe('clicking unmute button with valid server answer', () => {
            beforeEach(async () => {
              const button = screen.getByText('group.unmute')
              await fireEvent.click(button)
            })

            it('shows a success message', () => {
              expect(mocks.$toast.success).toHaveBeenCalledWith('group.unmuted')
            })
          })

          describe('clicking unmute button with server error', () => {
            beforeEach(async () => {
              mocks.$apollo.mutate = jest.fn().mockRejectedValue({ message: 'Ouch!' })
              const button = screen.getByText('group.unmute')
              await fireEvent.click(button)
            })

            it('shows error message', async () => {
              expect(mocks.$toast.error).toHaveBeenCalledWith('Ouch!')
            })
          })
        })

        describe('as pending member – "bob-der-baumeister"', () => {
          beforeEach(() => {
            currentUserMock.mockReturnValue(bobDerBaumeister)
            wrapper = Wrapper(() => {
              return {
                group: {
                  ...schoolForCitizens,
                  myRole: 'pending',
                },
                GroupMembers: [
                  { user: peterLustig, membership: { role: 'owner' } },
                  { user: jennyRostock, membership: { role: 'usual' } },
                  { user: bobDerBaumeister, membership: { role: 'usual' } },
                  { user: huey, membership: { role: 'usual' } },
                ],
              }
            })
          })

          it('renders', () => {
            expect(wrapper.container).toMatchSnapshot()
          })
        })

        describe('as none(!) member – "huey"', () => {
          beforeEach(() => {
            currentUserMock.mockReturnValue(huey)
            wrapper = Wrapper(() => {
              return {
                group: {
                  ...schoolForCitizens,
                  myRole: null,
                },
                GroupMembers: [
                  { user: peterLustig, membership: { role: 'owner' } },
                  { user: jennyRostock, membership: { role: 'usual' } },
                  { user: bobDerBaumeister, membership: { role: 'usual' } },
                  { user: huey, membership: { role: 'usual' } },
                ],
              }
            })
          })

          it('renders', () => {
            expect(wrapper.container).toMatchSnapshot()
          })
        })
      })
    })

    describe('given a hidden group – "investigative-journalism"', () => {
      describe('given a current user', () => {
        describe('as group owner – "peter-lustig"', () => {
          beforeEach(() => {
            currentUserMock.mockReturnValue(peterLustig)
            wrapper = Wrapper(() => {
              return {
                group: {
                  ...investigativeJournalism,
                  myRole: 'owner',
                },
                GroupMembers: [
                  { user: peterLustig, membership: { role: 'owner' } },
                  { user: jennyRostock, membership: { role: 'usual' } },
                  { user: bobDerBaumeister, membership: { role: 'usual' } },
                  { user: huey, membership: { role: 'usual' } },
                ],
              }
            })
          })

          it('renders', () => {
            expect(wrapper.container).toMatchSnapshot()
          })
        })

        describe('as usual member – "jenny-rostock"', () => {
          beforeEach(() => {
            currentUserMock.mockReturnValue(jennyRostock)
            wrapper = Wrapper(() => {
              return {
                group: {
                  ...investigativeJournalism,
                  myRole: 'usual',
                },
                GroupMembers: [
                  { user: peterLustig, membership: { role: 'owner' } },
                  { user: jennyRostock, membership: { role: 'usual' } },
                  { user: bobDerBaumeister, membership: { role: 'usual' } },
                  { user: huey, membership: { role: 'usual' } },
                ],
              }
            })
          })

          it('renders', () => {
            expect(wrapper.container).toMatchSnapshot()
          })
        })

        describe('as pending member – "bob-der-baumeister"', () => {
          beforeEach(() => {
            currentUserMock.mockReturnValue(bobDerBaumeister)
            wrapper = Wrapper(() => {
              return {
                group: {
                  ...investigativeJournalism,
                  myRole: 'pending',
                },
                GroupMembers: [
                  { user: peterLustig, membership: { role: 'owner' } },
                  { user: jennyRostock, membership: { role: 'usual' } },
                  { user: bobDerBaumeister, membership: { role: 'usual' } },
                  { user: huey, membership: { role: 'usual' } },
                ],
              }
            })
          })

          it('renders', () => {
            expect(wrapper.container).toMatchSnapshot()
          })
        })

        describe('as none(!) member – "huey"', () => {
          beforeEach(() => {
            currentUserMock.mockReturnValue(huey)
            wrapper = Wrapper(() => {
              return {
                group: {
                  ...investigativeJournalism,
                  myRole: null,
                },
                GroupMembers: [
                  { user: peterLustig, membership: { role: 'owner' } },
                  { user: jennyRostock, membership: { role: 'usual' } },
                  { user: bobDerBaumeister, membership: { role: 'usual' } },
                  { user: huey, membership: { role: 'usual' } },
                ],
              }
            })
          })

          it('renders', () => {
            expect(wrapper.container).toMatchSnapshot()
          })
        })
      })
    })
  })

  describe('roomUpdated subscription setup', () => {
    let subscribeMock
    let subscriptionMocks
    let savedErrorHandler
    let savedWarnHandler

    beforeEach(() => {
      // vue-test-utils refuses to install its own error handler if one is present
      savedErrorHandler = Vue.config.errorHandler
      savedWarnHandler = Vue.config.warnHandler
      Vue.config.errorHandler = null
      Vue.config.warnHandler = null
    })

    afterEach(() => {
      Vue.config.errorHandler = savedErrorHandler
      Vue.config.warnHandler = savedWarnHandler
    })

    const mountWithGroup = (group) => {
      subscriptionMocks = { unsubscribe: jest.fn() }
      subscribeMock = jest.fn().mockReturnValue({
        subscribe: jest.fn().mockReturnValue(subscriptionMocks),
      })
      currentUserMock.mockReturnValue(peterLustig)
      return mount(GroupProfileSlug, {
        localVue,
        store,
        stubs: {
          ...stubs,
          'infinite-loading': true,
          'masonry-grid': true,
          'masonry-grid-item': true,
          'post-teaser': true,
          'content-viewer': true,
        },
        mocks: {
          ...mocks,
          $apollo: {
            loading: false,
            mutate: jest.fn().mockResolvedValue(),
            subscribe: subscribeMock,
            queries: { chatRoom: { refetch: jest.fn() } },
          },
        },
        data: () => ({ group, GroupMembers: [] }),
      })
    }

    it('does not subscribe when group membership is unknown at mount', () => {
      mountWithGroup({})
      expect(subscribeMock).not.toHaveBeenCalled()
    })

    it('does not subscribe for non-members', () => {
      mountWithGroup({ ...yogaPractice, myRole: null })
      expect(subscribeMock).not.toHaveBeenCalled()
    })

    it('subscribes when group membership is already known at mount', () => {
      mountWithGroup({ ...yogaPractice, myRole: 'usual' })
      expect(subscribeMock).toHaveBeenCalledWith(
        expect.objectContaining({ fetchPolicy: 'no-cache' }),
      )
    })

    it('subscribes reactively when membership becomes known after mount', async () => {
      const wrapper = mountWithGroup({})
      expect(subscribeMock).not.toHaveBeenCalled()
      wrapper.setData({ group: { ...yogaPractice, myRole: 'usual' } })
      await wrapper.vm.$nextTick()
      expect(subscribeMock).toHaveBeenCalled()
    })

    it('does not double-subscribe if membership signal fires multiple times', async () => {
      const wrapper = mountWithGroup({ ...yogaPractice, myRole: 'usual' })
      // roomUpdated + groupShowMembers are both set up on mount for members
      expect(subscribeMock).toHaveBeenCalledTimes(2)
      wrapper.setData({ group: { ...yogaPractice, myRole: 'admin' } })
      await wrapper.vm.$nextTick()
      // neither subscription is set up again after role change
      expect(subscribeMock).toHaveBeenCalledTimes(2)
    })

    it('logs errors from the groupShowMembersChanged subscription', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
      const capturedCallbacks = []
      const capturingInnerSubscribe = jest.fn().mockImplementation((callbacks) => {
        capturedCallbacks.push(callbacks)
        return { unsubscribe: jest.fn() }
      })
      const capturingSubscribeMock = jest.fn().mockReturnValue({ subscribe: capturingInnerSubscribe })
      currentUserMock.mockReturnValue(peterLustig)
      mount(GroupProfileSlug, {
        localVue,
        store,
        stubs: {
          ...stubs,
          'infinite-loading': true,
          'masonry-grid': true,
          'masonry-grid-item': true,
          'post-teaser': true,
          'content-viewer': true,
        },
        mocks: {
          ...mocks,
          $apollo: {
            loading: false,
            mutate: jest.fn().mockResolvedValue(),
            subscribe: capturingSubscribeMock,
            queries: { chatRoom: { refetch: jest.fn() }, Group: { refetch: jest.fn() } },
          },
        },
        data: () => ({ group: { ...yogaPractice, myRole: 'usual' }, GroupMembers: [] }),
      })
      // subscribe is called twice: roomUpdated (index 0) and groupShowMembers (index 1)
      const groupShowMembersError = capturedCallbacks[1]?.error
      expect(groupShowMembersError).toBeDefined()
      const mockError = new Error('subscription failed')
      groupShowMembersError(mockError)
      expect(consoleSpy).toHaveBeenCalledWith(
        'groupShowMembersChanged subscription error:',
        mockError,
      )
      consoleSpy.mockRestore()
    })
  })

  describe('video call button (videoCall/enabled = true)', () => {
    let openVideoCallMock
    let savedErrorHandler
    let savedWarnHandler

    beforeEach(() => {
      savedErrorHandler = Vue.config.errorHandler
      savedWarnHandler = Vue.config.warnHandler
      Vue.config.errorHandler = null
      Vue.config.warnHandler = null
    })

    afterEach(() => {
      Vue.config.errorHandler = savedErrorHandler
      Vue.config.warnHandler = savedWarnHandler
    })

    const mountWithGroup = (group, extraMocks = {}) => {
      openVideoCallMock = jest.fn()
      currentUserMock.mockReturnValue(peterLustig)
      const enabledStore = new Vuex.Store({
        getters: {
          ...getters,
          'videoCall/enabled': () => true,
        },
        actions,
        mutations: {
          ...mutations,
          'videoCall/OPEN': openVideoCallMock,
        },
      })
      return mount(GroupProfileSlug, {
        localVue,
        store: enabledStore,
        stubs: {
          ...stubs,
          'infinite-loading': true,
          'masonry-grid': true,
          'masonry-grid-item': true,
          'post-teaser': true,
          'content-viewer': true,
          // OsCounterIcon validates an `icon` prop that we don't need to
          // exercise here; stub it so the prop-type warning doesn't blow up
          // the test via the global Vue.config.warnHandler. The component
          // is registered locally as PascalCase, so the stub key matches.
          OsCounterIcon: { props: ['icon', 'count'], template: '<i class="stub-counter-icon" />' },
          OsIcon: { props: ['icon'], template: '<i class="stub-icon" />' },
        },
        mocks: {
          ...mocks,
          ...extraMocks,
          $apollo: {
            loading: false,
            mutate: jest.fn().mockResolvedValue(),
            subscribe: jest.fn().mockReturnValue({
              subscribe: jest.fn().mockReturnValue({ unsubscribe: jest.fn() }),
            }),
            queries: { chatRoom: { refetch: jest.fn() } },
          },
        },
        data: () => ({ group, GroupMembers: [] }),
      })
    }

    it('renders the video-call button for a public group member', () => {
      const wrapper = mountWithGroup({ ...yogaPractice, myRole: 'usual' })
      expect(wrapper.find('[data-test="video-call-btn"]').exists()).toBe(true)
    })

    it('renders the video-call button for a non-public group member (joining is open to all)', () => {
      const wrapper = mountWithGroup({ ...yogaPractice, groupType: 'closed', myRole: 'usual' })
      expect(wrapper.find('[data-test="video-call-btn"]').exists()).toBe(true)
    })

    it('grays out the button (permission-denied) when the role may not open a call and none is running', () => {
      // No per-type open permission ($can → false) and no active call (count 0): the
      // button is shown but marked denied; joining-only would re-enable it.
      const wrapper = mountWithGroup(
        { ...yogaPractice, groupType: 'closed', myRole: 'usual' },
        { $can: () => false },
      )
      const button = wrapper.find('[data-test="video-call-btn"]')
      expect(button.exists()).toBe(true)
      expect(button.classes()).toContain('permission-denied')
    })

    it('does not gray out the button when a call is already running (join is allowed)', async () => {
      const wrapper = mountWithGroup(
        { ...yogaPractice, groupType: 'closed', myRole: 'usual' },
        { $can: () => false },
      )
      wrapper.setData({ videoCallParticipantCount: 2 })
      await wrapper.vm.$nextTick()
      const button = wrapper.find('[data-test="video-call-btn"]')
      expect(button.classes()).not.toContain('permission-denied')
    })

    it('hides the video-call button for non-members', () => {
      const wrapper = mountWithGroup({ ...yogaPractice, myRole: null })
      expect(wrapper.find('[data-test="video-call-btn"]').exists()).toBe(false)
    })

    it('hides the video-call button for pending members', () => {
      const wrapper = mountWithGroup({ ...yogaPractice, myRole: 'pending' })
      expect(wrapper.find('[data-test="video-call-btn"]').exists()).toBe(false)
    })

    it('dispatches videoCall/OPEN with the group payload when clicked', async () => {
      const group = {
        ...yogaPractice,
        myRole: 'usual',
        avatar: { url: 'http://example.test/avatar.png' },
      }
      const wrapper = mountWithGroup(group)
      await wrapper.find('[data-test="video-call-btn"]').trigger('click')
      expect(openVideoCallMock).toHaveBeenCalledTimes(1)
      expect(openVideoCallMock.mock.calls[0][1]).toEqual({
        groupId: group.id,
        groupName: group.name,
        groupSlug: group.slug,
        groupAvatar: group.avatar,
      })
    })

    it('does not dispatch videoCall/OPEN but shows a toast when the viewer may not open a call', async () => {
      // No open permission ($can → false) and no running call (count 0): clicking the
      // (still-clickable) button must short-circuit with feedback instead of an OPEN.
      const wrapper = mountWithGroup(
        { ...yogaPractice, groupType: 'closed', myRole: 'usual' },
        { $can: () => false },
      )
      await wrapper.find('[data-test="video-call-btn"]').trigger('click')
      expect(openVideoCallMock).not.toHaveBeenCalled()
      expect(mocks.$toast.error).toHaveBeenCalledWith('permissions.deniedHint')
    })

    it('dispatches videoCall/OPEN (no toast) when a call is already running, even without open permission', async () => {
      // Counter > 0 → this is a JOIN, allowed for any member regardless of the open
      // permission: the click must dispatch and not surface the denied feedback.
      const wrapper = mountWithGroup(
        { ...yogaPractice, groupType: 'closed', myRole: 'usual' },
        { $can: () => false },
      )
      wrapper.setData({ videoCallParticipantCount: 2 })
      await wrapper.vm.$nextTick()
      await wrapper.find('[data-test="video-call-btn"]').trigger('click')
      expect(openVideoCallMock).toHaveBeenCalledTimes(1)
      expect(mocks.$toast.error).not.toHaveBeenCalled()
    })

    it('refetches the count before denying, then proceeds with the JOIN when a call turns out to be running', async () => {
      // Stale snapshot: count is 0 at click time, but a refetch reveals a live call.
      // The client must re-check and not hard-block the JOIN on the stale value.
      const wrapper = mountWithGroup(
        { ...yogaPractice, groupType: 'closed', myRole: 'usual' },
        { $can: () => false },
      )
      const refetch = jest.fn().mockImplementation(() => {
        wrapper.vm.videoCallParticipantCount = 2
        return Promise.resolve()
      })
      wrapper.vm.$apollo.queries.videoCallParticipantCount = { refetch }
      await wrapper.find('[data-test="video-call-btn"]').trigger('click')
      await wrapper.vm.$nextTick()
      expect(refetch).toHaveBeenCalledTimes(1)
      expect(openVideoCallMock).toHaveBeenCalledTimes(1)
      expect(mocks.$toast.error).not.toHaveBeenCalled()
    })

    it('degrades gracefully when the pre-deny refetch fails: falls back to the stale count and denies', async () => {
      // Refetch rejects (network/load race): the failure must be swallowed (no unhandled
      // rejection / raw backend error) and the decision falls back to the stale count we
      // already have — which here is 0, so the JOIN stays denied with the usual toast.
      const wrapper = mountWithGroup(
        { ...yogaPractice, groupType: 'closed', myRole: 'usual' },
        { $can: () => false },
      )
      const refetch = jest.fn().mockRejectedValue(new Error('network down'))
      wrapper.vm.$apollo.queries.videoCallParticipantCount = { refetch }
      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {})
      await wrapper.find('[data-test="video-call-btn"]').trigger('click')
      await wrapper.vm.$nextTick()
      expect(refetch).toHaveBeenCalledTimes(1)
      expect(openVideoCallMock).not.toHaveBeenCalled()
      expect(mocks.$toast.error).toHaveBeenCalledWith('permissions.deniedHint')
      expect(consoleError).toHaveBeenCalled()
      consoleError.mockRestore()
    })

    // Regression guard: even with the "happy" combination (public group,
    // confirmed member, peter-lustig logged in) the button must stay hidden
    // when the feature flag is off. The other test scenarios in this file
    // (e.g. snapshot tests for various roles) all run with the default
    // store where videoCall/enabled is false; this case asserts the gate
    // explicitly so it can't be silently removed.
    it('hides the video-call button when videoCall/enabled is false (feature-flag off)', () => {
      openVideoCallMock = jest.fn()
      currentUserMock.mockReturnValue(peterLustig)
      const disabledStore = new Vuex.Store({
        getters: {
          ...getters,
          'videoCall/enabled': () => false,
        },
        actions,
        mutations: {
          ...mutations,
          'videoCall/OPEN': openVideoCallMock,
        },
      })
      const wrapper = mount(GroupProfileSlug, {
        localVue,
        store: disabledStore,
        stubs: {
          ...stubs,
          'infinite-loading': true,
          'masonry-grid': true,
          'masonry-grid-item': true,
          'post-teaser': true,
          'content-viewer': true,
          OsCounterIcon: { props: ['icon', 'count'], template: '<i class="stub-counter-icon" />' },
          OsIcon: { props: ['icon'], template: '<i class="stub-icon" />' },
        },
        mocks: {
          ...mocks,
          $apollo: {
            loading: false,
            mutate: jest.fn().mockResolvedValue(),
            subscribe: jest.fn().mockReturnValue({
              subscribe: jest.fn().mockReturnValue({ unsubscribe: jest.fn() }),
            }),
            queries: { chatRoom: { refetch: jest.fn() } },
          },
        },
        data: () => ({ group: { ...yogaPractice, myRole: 'usual' }, GroupMembers: [] }),
      })
      expect(wrapper.find('[data-test="video-call-btn"]').exists()).toBe(false)
    })
  })
})
