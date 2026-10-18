import GroupProfileSlug from './_slug.vue'
import { render, screen, fireEvent } from '@testing-library/vue'
import { mount } from '@vue/test-utils'
import Vue from 'vue'
import Vuex from 'vuex'
import { groupRights, groupRightsWithout } from '~/test/groupRightsFixture'
import { groupPermissionsChangedSubscription } from '~/graphql/groupRoles'
import { groupShowMembersChangedSubscription } from '~/graphql/groups'
import { roomUpdated } from '~/graphql/Rooms'

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

// jsdom has no ResizeObserver, and without one GroupDescription does not cap the text at all
// (it could never tell the reader there is more). A browser has one; give jsdom one that
// observes nothing, so the description measures once on mount as it does there.
global.ResizeObserver = class {
  observe() {}
  disconnect() {}
}

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
      if (!this.classList.contains('description-clamp')) return 0
      // Keyed off the inline max-height, which is where the cap actually lives —
      // uncapped once expanded, exactly as the real element is.
      return this.style.maxHeight ? clampHeight : contentHeight
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
    'auth/permissions': () => [],
    'auth/isModerator': () => false,
    'categories/categories': () => [{ id: 'cat1' }],
    'videoCall/enabled': () => false,
    'videoCall/showVideoCall': () => false,
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
      visibility: 'public',
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
      // ...groupRights('usual'),
    }
    schoolForCitizens = {
      id: 'g1',
      name: 'School For Citizens',
      slug: 'school-for-citizens',
      about: 'Our children shall receive education for life.',
      description: `<p class=""><em>English</em></p><h3>Our goal</h3><p>Only those who enjoy learning and do not lose their curiosity can obtain a good education for life and continue to learn with joy throughout their lives.</p><h3>Curiosity</h3><p>For this we need a school that takes up the curiosity of the children, the people, and satisfies it through a lot of experience.</p><p><br></p><p><em>Deutsch</em></p><h3>Unser Ziel</h3><p class="">Nur wer Spaß am Lernen hat und seine Neugier nicht verliert, kann gute Bildung für's Leben erlangen und sein ganzes Leben mit Freude weiter lernen.</p><h3>Neugier</h3><p class="">Dazu benötigen wir eine Schule, die die Neugier der Kinder, der Menschen, aufnimmt und durch viel Erfahrung befriedigt.</p>`,
      visibility: 'closed',
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
      // ...groupRights('usual'),
    }
    investigativeJournalism = {
      id: 'g0',
      name: 'Investigative Journalism',
      slug: 'investigative-journalism',
      about: 'Investigative journalists share ideas and insights and can collaborate.',
      description: `<p class=""><em>English:</em></p><p class="">This group is hidden.</p><h3>What is our group for?</h3><p>This group was created to allow investigative journalists to share and collaborate.</p><h3>How does it work?</h3><p>Here you can internally share posts and comments about them.</p><p><br></p><p><em>Deutsch:</em></p><p class="">Diese Gruppe ist verborgen.</p><h3>Wofür ist unsere Gruppe?</h3><p class="">Diese Gruppe wurde geschaffen, um investigativen Journalisten den Austausch und die Zusammenarbeit zu ermöglichen.</p><h3>Wie funktioniert das?</h3><p class="">Hier könnt ihr euch intern über Beiträge und Kommentare zu ihnen austauschen.</p>`,
      visibility: 'hidden',
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
      // ...groupRights('usual'),
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
                ...groupRights('owner'),
              },
            }
          })
        })

        it('renders', () => {
          expect(wrapper.container).toMatchSnapshot()
        })

        it('does not show the location map when the group has no location', () => {
          expect(wrapper.container.querySelector('.group-location-map')).toBeNull()
        })

        it('does not show a clickable location name/distance either, with nothing to scroll to', () => {
          expect(wrapper.container.querySelector('.location-info-button')).toBeNull()
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
                ...groupRights('owner'),
                description: linkedDescription,
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
      })

      describe('as usual member – "jenny-rostock"', () => {
        beforeEach(() => {
          currentUserMock.mockReturnValue(jennyRostock)
          wrapper = Wrapper(() => {
            return {
              group: {
                ...yogaPractice,
                ...groupRights('usual'),
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
                ...groupRights('pending'),
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
                ...groupRights(null),
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
                  ...groupRights('owner'),
                },
              }
            })
          })

          it('renders', () => {
            expect(wrapper.container).toMatchSnapshot()
          })

          it('shows a read-only map with the group location', () => {
            expect(wrapper.container.querySelector('.group-location-map')).not.toBeNull()
            expect(wrapper.container.querySelector('.location-picker-map')).not.toBeNull()
          })

          describe('clicking the location name/distance', () => {
            let scrollIntoViewSpy

            beforeEach(() => {
              scrollIntoViewSpy = jest.fn()
              Element.prototype.scrollIntoView = scrollIntoViewSpy
            })

            afterEach(() => {
              delete Element.prototype.scrollIntoView
            })

            it('scrolls to the location map', async () => {
              const button = wrapper.container.querySelector('.location-info-button')
              await fireEvent.click(button)

              expect(scrollIntoViewSpy).toHaveBeenCalledWith({
                behavior: 'smooth',
                block: 'center',
              })
            })
          })
        })

        describe('as usual member – "jenny-rostock"', () => {
          beforeEach(() => {
            currentUserMock.mockReturnValue(jennyRostock)
            wrapper = Wrapper(() => {
              return {
                group: {
                  ...schoolForCitizens,
                  ...groupRights('usual'),
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
                  ...groupRights('pending'),
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
                  // A closed group asks rather than admits: its `none` role holds
                  // group.join.request, not group.join, so the button offers "ask to join".
                  myGroupRole: null,
                  myGroupPermissions: ['group.read', 'group.join.request'],
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
                  ...groupRights('owner'),
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
                  ...groupRights('usual'),
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
                  // An applicant to an UNLISTED group sees that they applied and nothing else:
                  // its `pending` role holds no `group.read`, where a listed group's does.
                  ...groupRightsWithout('pending', 'group.read'),
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
                  // A hidden group's `none` role holds nothing: no door, no button.
                  myGroupRole: null,
                  myGroupPermissions: [],
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

  // A description that changes while the page is open (an owner editing it in place) is
  // measured again, without waiting for the observer.
  // #6442: on the server every query has finished when the page renders; on the client others
  // (the video call's participant count) are still running when it hydrates. The post list must
  // not ask "is anything loading", or a group without posts hydrates a spinner where the server
  // rendered "no posts" and Vue throws the whole page away.
  describe('the post list', () => {
    const owner = () => ({ ...yogaPractice, ...groupRights('owner') })
    // The post grid only: other parts of the page have spinners and empty states of their own.
    const postGrid = () => wrapper.container.querySelector('.ds-grid')
    const spinner = () => postGrid().querySelector('.os-spinner')
    const empty = () => postGrid().querySelector('.hc-empty')

    beforeEach(() => {
      currentUserMock.mockReturnValue(peterLustig)
    })

    it('shows a spinner until the posts have loaded', () => {
      wrapper = Wrapper(() => ({ group: owner(), posts: null }))
      expect(spinner()).not.toBeNull()
      expect(empty()).toBeNull()
    })

    it('shows "no posts" for an empty result, while another query is still loading', () => {
      mocks.$apollo.loading = true
      wrapper = Wrapper(() => ({ group: owner(), posts: [] }))
      expect(empty()).not.toBeNull()
      expect(spinner()).toBeNull()
    })
  })

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
          // as empty. Real tiptap attaches its DOM a tick after it renders — in a browser
          // too, which is what the ResizeObserver is for (#10488).
          'content-viewer': {
            props: ['content'],
            template: '<div>{{ content }}</div>',
          },
        },
        mocks,
        data: () => ({ group: { ...yogaPractice, ...groupRights('owner'), description: '' } }),
      })
      await Vue.nextTick()
      expect(wrapper.find('.collaps-button').exists()).toBe(false)

      await wrapper.setData({
        group: {
          ...yogaPractice,
          ...groupRights('owner'),
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

  // The first visit by client-side navigation (#10488): the page mounts before Apollo has the
  // group, so there is no description to measure yet. Measuring from the page's own mount
  // missed it for good; the description now measures from ITS mount.
  it('offers "show more" for a group that arrives after the page mounted', async () => {
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
      },
      mocks,
      data: () => ({ group: {} }),
    })
    await Vue.nextTick()
    expect(wrapper.find('.group-description').exists()).toBe(false)

    await wrapper.setData({ group: { ...yogaPractice, ...groupRights('owner') } })
    await Vue.nextTick()

    expect(wrapper.find('.collaps-button').exists()).toBe(true)
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

    // Which document a call carries, rather than how many calls there were: the page sets up
    // several subscriptions under different conditions, and counting them couples every test
    // here to all of them.
    const callsFor = (document) =>
      subscribeMock.mock.calls.filter(([options]) => options.query === document)

    it('does not subscribe to the member list when group membership is unknown at mount', () => {
      mountWithGroup({})
      expect(callsFor(groupShowMembersChangedSubscription())).toHaveLength(0)
    })

    it('does not subscribe to the member list for non-members', () => {
      mountWithGroup({ ...yogaPractice, ...groupRights(null) })
      expect(callsFor(groupShowMembersChangedSubscription())).toHaveLength(0)
    })

    it('subscribes to the member list when group membership is already known at mount', () => {
      mountWithGroup({ ...yogaPractice, ...groupRights('usual') })
      expect(callsFor(groupShowMembersChangedSubscription())).toHaveLength(1)
      expect(subscribeMock).toHaveBeenCalledWith(
        expect.objectContaining({ fetchPolicy: 'no-cache' }),
      )
    })

    it('subscribes reactively when membership becomes known after mount', async () => {
      const wrapper = mountWithGroup({})
      expect(callsFor(groupShowMembersChangedSubscription())).toHaveLength(0)
      wrapper.setData({ group: { ...yogaPractice, ...groupRights('usual') } })
      await wrapper.vm.$nextTick()
      expect(callsFor(groupShowMembersChangedSubscription())).toHaveLength(1)
    })

    it('does not double-subscribe if membership signal fires multiple times', async () => {
      const wrapper = mountWithGroup({ ...yogaPractice, ...groupRights('usual') })
      // roomUpdated + groupShowMembers + groupPermissions are set up on mount for members
      expect(subscribeMock).toHaveBeenCalledTimes(3)
      wrapper.setData({ group: { ...yogaPractice, ...groupRights('admin') } })
      await wrapper.vm.$nextTick()
      // no subscription is set up again after a role change
      expect(subscribeMock).toHaveBeenCalledTimes(3)
    })

    // The rights behind every button on this page can change under the viewer: an owner edits a
    // role, somebody is promoted, the group's door opens or closes. Non-members included —
    // their rights live in the group's `none` role.
    it('subscribes to the rights of the group, membership or not', () => {
      mountWithGroup({ ...yogaPractice, ...groupRights(null) })

      expect(callsFor(groupPermissionsChangedSubscription())).toHaveLength(1)
      expect(callsFor(groupPermissionsChangedSubscription())[0][0]).toMatchObject({
        variables: { groupId: 'g1' },
        fetchPolicy: 'no-cache',
      })
    })

    it('refetches the group when its rights change', () => {
      const capturedCallbacks = []
      subscribeMock = jest.fn().mockImplementation(({ query }) => ({
        subscribe: jest.fn().mockImplementation((callbacks) => {
          capturedCallbacks.push({ query, callbacks })
          return { unsubscribe: jest.fn() }
        }),
      }))
      const refetch = jest.fn()
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
            subscribe: subscribeMock,
            queries: { chatRoom: { refetch: jest.fn() }, Group: { refetch } },
          },
        },
        data: () => ({ group: { ...yogaPractice, ...groupRights('usual') } }),
      })

      const entry = capturedCallbacks.find(
        ({ query }) => query === groupPermissionsChangedSubscription(),
      )
      expect(entry).toBeDefined()
      entry.callbacks.next({})

      expect(refetch).toHaveBeenCalled()
    })

    // What the viewer may do in the group is capped by their NETWORK rights. A change to those
    // reaches the page through the store, not through the group's own signal.
    describe("the viewer's network rights", () => {
      const keys = (networkPermissions) =>
        GroupProfileSlug.computed.networkPermissionKeys.call({ networkPermissions })

      // Real state behind the getter, so the rights change in the store the way they do in the
      // app — on a permissionsChanged signal — and the page's watcher fires on its own.
      const mountWithPermissions = (permissions) => {
        const refetch = jest.fn()
        currentUserMock.mockReturnValue(peterLustig)
        const permissionStore = new Vuex.Store({
          state: { permissions },
          getters: { ...getters, 'auth/permissions': (state) => state.permissions },
          actions,
          mutations: {
            ...mutations,
            SET_PERMISSIONS(state, next) {
              state.permissions = next
            },
          },
        })
        const wrapper = mount(GroupProfileSlug, {
          localVue,
          store: permissionStore,
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
              subscribe: jest.fn().mockReturnValue({
                subscribe: jest.fn().mockReturnValue({ unsubscribe: jest.fn() }),
              }),
              queries: { chatRoom: { refetch: jest.fn() }, Group: { refetch } },
            },
          },
          data: () => ({ group: { ...yogaPractice, ...groupRights('usual') } }),
        })
        const reloadGroup = jest.spyOn(wrapper.vm, 'reloadGroup')
        return { wrapper, refetch, reloadGroup }
      }

      it('refetches the group when they change', async () => {
        const { wrapper, refetch, reloadGroup } = mountWithPermissions([
          { key: 'videoCall.create_open', group: 'communication' },
        ])
        expect(refetch).not.toHaveBeenCalled()

        wrapper.vm.$store.commit('SET_PERMISSIONS', [
          { key: 'videoCall.create_open', group: 'communication' },
          { key: 'videoCall.create_restricted', group: 'communication' },
        ])
        await Vue.nextTick()

        expect(reloadGroup).toHaveBeenCalledTimes(1)
        expect(refetch).toHaveBeenCalledTimes(1)
      })

      it('leaves the group alone when the same rights arrive again', async () => {
        const { wrapper, refetch } = mountWithPermissions([
          { key: 'videoCall.create_open', group: 'communication' },
        ])

        // A new list with the same content: what the store commits when the signal was about
        // a role the viewer does not hold.
        wrapper.vm.$store.commit('SET_PERMISSIONS', [
          { key: 'videoCall.create_open', group: 'communication' },
        ])
        await Vue.nextTick()

        expect(refetch).not.toHaveBeenCalled()
      })

      it('count as changed when a right is gained or lost', () => {
        const before = keys([{ key: 'videoCall.create_open', group: 'communication' }])
        const gained = keys([
          { key: 'videoCall.create_open', group: 'communication' },
          { key: 'videoCall.create_restricted', group: 'communication' },
        ])
        expect(gained).not.toBe(before)
        expect(keys([])).not.toBe(before)
      })

      it('count as unchanged when the same rights arrive again, in whatever order', () => {
        const one = keys([{ key: 'a' }, { key: 'b' }])
        const again = keys([{ key: 'b' }, { key: 'a' }])
        expect(again).toBe(one)
      })

      it('are no rights at all before the store has any', () => {
        expect(keys(undefined)).toBe('')
      })
    })

    it('logs errors from the groupPermissionsChanged subscription', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
      const capturedCallbacks = []
      subscribeMock = jest.fn().mockImplementation(({ query }) => ({
        subscribe: jest.fn().mockImplementation((callbacks) => {
          capturedCallbacks.push({ query, callbacks })
          return { unsubscribe: jest.fn() }
        }),
      }))
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
            subscribe: subscribeMock,
            queries: { chatRoom: { refetch: jest.fn() }, Group: { refetch: jest.fn() } },
          },
        },
        data: () => ({ group: { ...yogaPractice, ...groupRights('usual') } }),
      })

      const entry = capturedCallbacks.find(
        ({ query }) => query === groupPermissionsChangedSubscription(),
      )
      const mockError = new Error('subscription failed')
      entry.callbacks.error(mockError)

      expect(consoleSpy).toHaveBeenCalledWith(
        'groupPermissionsChanged subscription error:',
        mockError,
      )
      consoleSpy.mockRestore()
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
        data: () => ({ group: { ...yogaPractice, ...groupRights('usual') } }),
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

  describe("group action buttons follow the group's rights", () => {
    let subscribeMock
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

    const mountWithGroup = (group) => {
      subscribeMock = jest.fn().mockReturnValue({
        subscribe: jest.fn().mockReturnValue({ unsubscribe: jest.fn() }),
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
          OsCounterIcon: { props: ['icon', 'count'], template: '<i class="stub-counter-icon" />' },
          OsIcon: { props: ['icon'], template: '<i class="stub-icon" />' },
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

    it('offers the chat to a member who holds group.chat.read', () => {
      const wrapper = mountWithGroup({ ...yogaPractice, ...groupRights('usual') })
      expect(wrapper.find('[data-test="chat-btn"]').exists()).toBe(true)
    })

    it('offers the chat to a member who may read it but not write in it', () => {
      // Opening the chat is reading it; the input row is the chat's own business (Chat.vue).
      const wrapper = mountWithGroup({
        ...yogaPractice,
        ...groupRightsWithout('usual', 'group.chat.write'),
      })
      expect(wrapper.find('[data-test="chat-btn"]').exists()).toBe(true)
    })

    it('hides the chat when the group withheld the right from its members', () => {
      // Being a member is no longer the question: the backend decides CreateGroupRoom on
      // group.chat.read, so a button offered without it would only produce an error toast.
      const wrapper = mountWithGroup({
        ...yogaPractice,
        ...groupRightsWithout('usual', 'group.chat.read', 'group.chat.write'),
      })
      expect(wrapper.find('[data-test="chat-btn"]').exists()).toBe(false)
    })

    const subscribedTo = (document) =>
      subscribeMock.mock.calls.filter(([options]) => options.query === document)

    it('does not subscribe to room updates without the chat right', () => {
      mountWithGroup({
        ...yogaPractice,
        ...groupRightsWithout('usual', 'group.chat.read', 'group.chat.write'),
      })
      // The other two still subscribe — one follows the membership, one the group's rights.
      expect(subscribedTo(roomUpdated())).toHaveLength(0)
      expect(subscribedTo(groupShowMembersChangedSubscription())).toHaveLength(1)
    })

    it('subscribes to room updates once the chat right arrives after mount', async () => {
      const wrapper = mountWithGroup({})
      expect(subscribedTo(roomUpdated())).toHaveLength(0)
      wrapper.setData({ group: { ...yogaPractice, ...groupRights('usual') } })
      await wrapper.vm.$nextTick()
      expect(subscribedTo(roomUpdated())).toHaveLength(1)
    })

    it('marks the new-post button denied when the group withheld group.post.create', () => {
      const wrapper = mountWithGroup({
        ...yogaPractice,
        ...groupRightsWithout('usual', 'group.post.create'),
      })
      const button = wrapper.find('.profile-post-add-button')
      expect(button.exists()).toBe(true)
      expect(button.classes()).toContain('permission-denied')
      expect(button.attributes('aria-disabled')).toBe('true')
    })

    it('leaves the new-post button alone for a member who may post', () => {
      const wrapper = mountWithGroup({ ...yogaPractice, ...groupRights('usual') })
      const button = wrapper.find('.profile-post-add-button')
      expect(button.exists()).toBe(true)
      expect(button.classes()).not.toContain('permission-denied')
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
        // Real state behind the getter, so a test can open and close the call and the page's
        // watcher fires the way it does in the app.
        state: { videoCallOpen: false },
        getters: {
          ...getters,
          'videoCall/enabled': () => true,
          'videoCall/showVideoCall': (state) => state.videoCallOpen,
        },
        actions,
        mutations: {
          ...mutations,
          'videoCall/OPEN': openVideoCallMock,
          SET_VIDEO_CALL_OPEN(state, open) {
            state.videoCallOpen = open
          },
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
      const wrapper = mountWithGroup({ ...yogaPractice, ...groupRights('usual') })
      expect(wrapper.find('[data-test="video-call-btn"]').exists()).toBe(true)
    })

    it('renders the video-call button for a non-public group member (joining is open to all)', () => {
      const wrapper = mountWithGroup({
        ...yogaPractice,
        visibility: 'closed',
        ...groupRights('usual'),
      })
      expect(wrapper.find('[data-test="video-call-btn"]').exists()).toBe(true)
    })

    it('grays out the button (permission-denied) when the role may not open a call and none is running', () => {
      // The group withheld group.videoCall.create from its members and no call is running
      // (count 0): the button is shown but marked denied; joining-only would re-enable it.
      const wrapper = mountWithGroup({
        ...yogaPractice,
        visibility: 'closed',
        ...groupRightsWithout('usual', 'group.videoCall.create'),
      })
      const button = wrapper.find('[data-test="video-call-btn"]')
      expect(button.exists()).toBe(true)
      expect(button.classes()).toContain('permission-denied')
    })

    it('does not gray out the button when a call is already running (join is allowed)', async () => {
      const wrapper = mountWithGroup({
        ...yogaPractice,
        visibility: 'closed',
        ...groupRightsWithout('usual', 'group.videoCall.create'),
      })
      wrapper.setData({ videoCallParticipantCount: 2 })
      await wrapper.vm.$nextTick()
      const button = wrapper.find('[data-test="video-call-btn"]')
      expect(button.classes()).not.toContain('permission-denied')
    })

    it('hides the video-call button for non-members', () => {
      const wrapper = mountWithGroup({ ...yogaPractice, ...groupRights(null) })
      expect(wrapper.find('[data-test="video-call-btn"]').exists()).toBe(false)
    })

    it('hides the video-call button for pending members', () => {
      const wrapper = mountWithGroup({ ...yogaPractice, ...groupRights('pending') })
      expect(wrapper.find('[data-test="video-call-btn"]').exists()).toBe(false)
    })

    it('dispatches videoCall/OPEN with the group payload when clicked', async () => {
      const group = {
        ...yogaPractice,
        ...groupRights('usual'),
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
      // No group.videoCall.create and no running call (count 0): clicking the
      // (still-clickable) button must short-circuit with feedback instead of an OPEN.
      const wrapper = mountWithGroup({
        ...yogaPractice,
        visibility: 'closed',
        ...groupRightsWithout('usual', 'group.videoCall.create'),
      })
      await wrapper.find('[data-test="video-call-btn"]').trigger('click')
      expect(openVideoCallMock).not.toHaveBeenCalled()
      expect(mocks.$toast.error).toHaveBeenCalledWith('permissions.deniedHint')
    })

    it('dispatches videoCall/OPEN (no toast) when a call is already running, even without open permission', async () => {
      // Counter > 0 → this is a JOIN, allowed for anybody holding group.videoCall.join
      // whether or not they may open one: the click must dispatch and not surface the toast.
      const wrapper = mountWithGroup({
        ...yogaPractice,
        visibility: 'closed',
        ...groupRightsWithout('usual', 'group.videoCall.create'),
      })
      wrapper.setData({ videoCallParticipantCount: 2 })
      await wrapper.vm.$nextTick()
      await wrapper.find('[data-test="video-call-btn"]').trigger('click')
      expect(openVideoCallMock).toHaveBeenCalledTimes(1)
      expect(mocks.$toast.error).not.toHaveBeenCalled()
    })

    it('refetches the count before denying, then proceeds with the JOIN when a call turns out to be running', async () => {
      // Stale snapshot: count is 0 at click time, but a refetch reveals a live call.
      // The client must re-check and not hard-block the JOIN on the stale value.
      const wrapper = mountWithGroup({
        ...yogaPractice,
        visibility: 'closed',
        ...groupRightsWithout('usual', 'group.videoCall.create'),
      })
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
      const wrapper = mountWithGroup({
        ...yogaPractice,
        visibility: 'closed',
        ...groupRightsWithout('usual', 'group.videoCall.create'),
      })
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

    describe('after the viewer hung up', () => {
      const setCallOpen = async (wrapper, open) => {
        wrapper.vm.$store.commit('SET_VIDEO_CALL_OPEN', open)
        await wrapper.vm.$nextTick()
      }
      const hangUp = async (wrapper) => {
        await setCallOpen(wrapper, true)
        await setCallOpen(wrapper, false)
      }

      it('fetches the count anew: the one from arriving here still included the viewer', async () => {
        const wrapper = mountWithGroup(yogaPractice)
        const refetch = jest.fn().mockResolvedValue()
        wrapper.vm.$apollo.queries.videoCallParticipantCount = { refetch }
        await hangUp(wrapper)
        expect(refetch).toHaveBeenCalledTimes(1)
      })

      it('leaves the count alone when a call opens', async () => {
        const wrapper = mountWithGroup(yogaPractice)
        const refetch = jest.fn().mockResolvedValue()
        wrapper.vm.$apollo.queries.videoCallParticipantCount = { refetch }
        await setCallOpen(wrapper, true)
        expect(refetch).not.toHaveBeenCalled()
      })

      it('keeps the count it has when fetching fails', async () => {
        const wrapper = mountWithGroup(yogaPractice)
        wrapper.setData({ videoCallParticipantCount: 1 })
        wrapper.vm.$apollo.queries.videoCallParticipantCount = {
          refetch: jest.fn().mockRejectedValue(new Error('network down')),
        }
        const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {})
        await hangUp(wrapper)
        // The rejection is handled a turn after the watcher fired.
        await wrapper.vm.$nextTick()
        expect(wrapper.vm.videoCallParticipantCount).toBe(1)
        expect(consoleError).toHaveBeenCalled()
        consoleError.mockRestore()
      })
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
        data: () => ({ group: { ...yogaPractice, ...groupRights('usual') } }),
      })
      expect(wrapper.find('[data-test="video-call-btn"]').exists()).toBe(false)
    })
  })
})
