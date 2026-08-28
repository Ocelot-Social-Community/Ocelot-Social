import GroupProfileSlug from './_slug.vue'
import { render, screen, fireEvent } from '@testing-library/vue'
import { mount } from '@vue/test-utils'
import { branding as brandingDefaults } from '@ocelot-social/branding'
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
  'group-page-member-list': true,
}

// Mock Math.random, used in Dropdown
Object.assign(Math, {
  random: () => 0,
})

jest.mock('vue-infinite-loading', () => ({}))

// jsdom does no layout, so every element reports height 0 and the description would
// always measure as "fits". Fake just the two numbers the overflow check reads: the
// natural height of the content and the height the collapsed cap leaves it.
// `contentHeight` above `clampHeight` is a description that needs a "show more".
const stubDescriptionHeights = ({ contentHeight, clampHeight }) => {
  const originals = {
    scrollHeight: Object.getOwnPropertyDescriptor(Element.prototype, 'scrollHeight'),
    clientHeight: Object.getOwnPropertyDescriptor(Element.prototype, 'clientHeight'),
  }
  Object.defineProperty(Element.prototype, 'scrollHeight', {
    configurable: true,
    get() {
      if (!this.parentElement?.classList.contains('description-clamp')) return 0
      // Empty description => no height, so "the group has not loaded yet" does not
      // masquerade as content that needs a toggle.
      return this.textContent.trim() ? contentHeight : 0
    },
  })
  Object.defineProperty(Element.prototype, 'clientHeight', {
    configurable: true,
    get() {
      // Uncapped once expanded — the real element then has no max-height either.
      if (!this.classList.contains('description-clamp')) return 0
      return this.classList.contains('description-clamp--collapsed') ? clampHeight : contentHeight
    },
  })
  return () => {
    Object.defineProperty(Element.prototype, 'scrollHeight', originals.scrollHeight)
    Object.defineProperty(Element.prototype, 'clientHeight', originals.clientHeight)
  }
}

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
  let restoreDescriptionHeights

  const currentUserMock = jest.fn()

  // The fixtures below are the seeded descriptions — long enough to be truncated in
  // reality, so the default for the suite is "overflows" and the toggle is present.
  beforeEach(() => {
    restoreDescriptionHeights = stubDescriptionHeights({ contentHeight: 500, clampHeight: 100 })
  })

  afterEach(() => {
    restoreDescriptionHeights()
  })

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
      // No removeLinks: this page must not strip links from the description.
      $filters: {
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

        describe('given a description containing links', () => {
          const linkedDescription =
            '<p>Read the <a href="https://ocelot.social">handbook</a> and the <a href="https://example.org">FAQ</a> before joining.</p>'
          const linkedGroup = () => () => {
            return {
              group: {
                ...yogaPractice,
                myRole: 'owner',
                description: linkedDescription,
                descriptionExcerpt: linkedDescription,
              },
            }
          }

          beforeEach(() => {
            wrapper = Wrapper(linkedGroup())
          })

          // Scoped to this wrapper rather than `screen`: the outer beforeEach
          // already rendered a second instance into the same document.
          const description = () => wrapper.container.querySelector('.group-description')
          const descriptionLinks = () =>
            Array.from(description().querySelectorAll('a')).map((a) => a.getAttribute('href'))

          it('keeps the links while collapsed', () => {
            expect(description().textContent).toContain('comment.show.more')
            expect(descriptionLinks()).toEqual(['https://ocelot.social', 'https://example.org'])
          })

          it('keeps the text between two links while collapsed', () => {
            expect(description().textContent).toContain('and the')
          })

          it('keeps the links after "show more"', async () => {
            await fireEvent.click(description().querySelector('.collaps-button'))

            expect(description().textContent).toContain('comment.show.less')
            expect(descriptionLinks()).toEqual(['https://ocelot.social', 'https://example.org'])
          })

          // ContentViewer instantiates tiptap in data() and needs `document`, so it
          // must stay out of the first (server-side) render. Asserting synchronously
          // is what pins this down: `hydrated` flips in mounted()'s $nextTick, i.e.
          // in a microtask that has not run yet while this test body executes.
          it('renders plain HTML instead of the tiptap viewer before hydration', () => {
            const ssrWrapper = render(GroupProfileSlug, {
              mocks,
              localVue,
              data: linkedGroup(),
              stubs,
              store,
            })
            const ssrDescription = ssrWrapper.container.querySelector('.group-description')

            expect(ssrDescription.querySelector('.ProseMirror')).toBeNull()
            expect(
              Array.from(ssrDescription.querySelectorAll('a')).map((a) => a.getAttribute('href')),
            ).toEqual(['https://ocelot.social', 'https://example.org'])
          })
        })

        // The collapsed height is a CSS cap on the full description, not a character
        // cut — that is what makes it independent of whether the text starts with a
        // heading and a list or with a paragraph.
        describe('collapsed description height', () => {
          const clamp = () => wrapper.container.querySelector('.description-clamp')
          const toggle = () => wrapper.container.querySelector('.collaps-button')
          // The overflow verdict only reaches the DOM on the next tick, so re-render
          // and wait rather than reusing the wrapper from the enclosing beforeEach.
          const renderGroup = async (group = yogaPractice) => {
            wrapper = Wrapper(() => ({ group: { ...group, myRole: 'owner' } }))
            await Vue.nextTick()
          }

          it('caps the height at the branded number of lines while collapsed', async () => {
            await renderGroup()

            expect(clamp().classList).toContain('description-clamp--collapsed')
            expect(clamp().style.getPropertyValue('--group-description-lines')).toBe(
              String(brandingDefaults.group.descriptionCollapsedLines),
            )
          })

          it('offers the toggle and fades the cut edge when the description exceeds the cap', async () => {
            await renderGroup()

            expect(toggle()).not.toBeNull()
            expect(clamp().classList).toContain('description-clamp--faded')
          })

          it('lifts the cap and the fade once expanded', async () => {
            await renderGroup()

            await fireEvent.click(toggle())

            expect(clamp().classList).not.toContain('description-clamp--collapsed')
            expect(clamp().classList).not.toContain('description-clamp--faded')
          })

          // An always-visible toggle on a description that already fits is a dead end
          // — this is what the character-count excerpt could not tell us.
          it('hides the toggle and the fade when the description fits', async () => {
            restoreDescriptionHeights()
            restoreDescriptionHeights = stubDescriptionHeights({
              contentHeight: 40,
              clampHeight: 100,
            })

            await renderGroup()

            expect(toggle()).toBeNull()
            expect(clamp().classList).not.toContain('description-clamp--faded')
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

  // The group arrives from Apollo AFTER mount, so the first overflow measurement runs
  // against an empty card. ResizeObserver covers this in a browser, but not where it is
  // missing — and not in jsdom, which is exactly why this is asserted here.
  describe('description overflow re-measurement', () => {
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

    it('shows the toggle once a description arrives after mount', async () => {
      currentUserMock.mockReturnValue(peterLustig)
      const wrapper = mount(GroupProfileSlug, {
        localVue,
        store,
        stubs: {
          ...stubs,
          'infinite-loading': true,
          'masonry-grid': true,
          'masonry-grid-item': true,
          'post-teaser': true,
          // A stub that actually renders its content: the measurement reads the
          // rendered text, and the default empty stub would report every description
          // as empty. Real tiptap is no use here either — it attaches its DOM
          // imperatively, so in jsdom the text is not there yet when the watcher
          // measures, which is a quirk of the editor and not of this wiring.
          'content-viewer': {
            props: ['content'],
            template: '<div>{{ content }}</div>',
          },
        },
        mocks,
        data: () => ({ group: { ...yogaPractice, myRole: 'owner', description: '' } }),
      })
      await Vue.nextTick()
      expect(wrapper.find('.collaps-button').exists()).toBe(false)

      await wrapper.setData({
        group: {
          ...yogaPractice,
          myRole: 'owner',
          description: '<p>Now there is something to read.</p>',
        },
      })
      // Two ticks: one for the watcher's deferred measurement, one for the re-render
      // the resulting `descriptionOverflows` change schedules.
      await Vue.nextTick()
      await Vue.nextTick()

      expect(wrapper.find('.collaps-button').exists()).toBe(true)
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
        data: () => ({ group }),
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
      const capturingSubscribeMock = jest
        .fn()
        .mockReturnValue({ subscribe: capturingInnerSubscribe })
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
        data: () => ({ group: { ...yogaPractice, myRole: 'usual' } }),
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
        data: () => ({ group }),
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
        data: () => ({ group: { ...yogaPractice, myRole: 'usual' } }),
      })
      expect(wrapper.find('[data-test="video-call-btn"]').exists()).toBe(false)
    })
  })
})
